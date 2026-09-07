import {
  Global,
  Inject,
  Injectable,
  Logger,
  Module,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Pool, PoolClient } from 'pg';

/** Injection token for the one connection pool the whole app shares. */
export const PG_POOL = 'PG_POOL';

/**
 * Anything a query can be run against.
 *
 * A pool checks out a connection per call and hands it straight back, which is
 * what almost every read wants. A client is one connection held open, which is
 * the only way to run several statements inside one transaction. Every method
 * that writes takes one of these rather than reaching for the pool itself, so
 * the caller decides whether its write stands alone or joins a transaction
 * already in progress.
 */
export type Queryable = Pool | PoolClient;

/**
 * Runs `work` inside a single transaction, on one connection.
 *
 * Either every statement lands or none of them do. The rollback is in a catch
 * rather than left to the connection closing, because a client returned to the
 * pool mid-transaction would carry the open transaction to whoever gets it
 * next.
 */
export async function withTransaction<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Whether an error is Postgres refusing a duplicate.
 *
 * 23505 is `unique_violation`. It is how a race that two requests both thought
 * they had won actually surfaces - the loser's insert is rejected - so a caller
 * that has a better sentence than "500" for that case can catch it here.
 */
export function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: string }).code === '23505'
  );
}

/**
 * Closes the pool when Nest shuts down.
 *
 * Without it a redeploy leaves connections open on the database until they time
 * out, and Postgres has a hard cap on how many it will hold at once.
 */
@Injectable()
export class DatabaseLifecycle implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseLifecycle.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('Database pool closed');
  }
}

/**
 * The one place a database connection is configured.
 *
 * Global, so the five services that store things can inject `PG_POOL` without
 * every module in the tree importing this one - there is only ever a single
 * pool, and passing it down by hand would be ceremony with no decision in it.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString = config.get<string>('DATABASE_URL');
        if (!connectionString) {
          // Failing at boot rather than on the first request: a server that
          // starts and then 500s every call looks like an outage, while this
          // says exactly what is missing.
          throw new Error(
            'DATABASE_URL must be set. Copy it from the Railway Postgres ' +
              'service - DATABASE_PUBLIC_URL when connecting from a laptop.',
          );
        }

        return new Pool({
          connectionString,
          // Railway's public proxy terminates TLS with a certificate Node does
          // not trust out of the box, so verification is turned off for it.
          // The private host is inside their network and speaks plain TCP.
          ssl: connectionString.includes('railway.internal')
            ? false
            : { rejectUnauthorized: false },
          // Comfortably under Postgres's default 100 connections, with room
          // for more than one instance of this server.
          max: 10,
          // A connection that has been idle this long is worth more back in
          // the pool than held open against a database on another host.
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
        });
      },
    },
    DatabaseLifecycle,
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
