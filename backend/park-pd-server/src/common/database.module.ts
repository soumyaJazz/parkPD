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
import { environment } from '../config';

/** Injection token for the one connection pool the whole app shares. */
export const PG_POOL = 'PG_POOL';

/**
 * Module-scoped rather than injected: the pool's error listener outlives any
 * one request and fires from the driver's own callbacks, where there is no
 * injection context to reach a logger through.
 */
const logger = new Logger('Database');

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

        const pool = new Pool({
          connectionString,
          // Railway's public proxy terminates TLS with a certificate Node does
          // not trust out of the box, so verification is turned off for it.
          // The private host is inside their network and speaks plain TCP.
          ssl: connectionString.includes('railway.internal')
            ? false
            : { rejectUnauthorized: false },
          // Sizes are per-environment - see src/config/environments. A laptop
          // and a deployed instance want different ceilings against what may
          // well be the same database.
          max: environment.database.poolMax,
          idleTimeoutMillis: environment.database.idleTimeoutMillis,
          connectionTimeoutMillis: environment.database.connectionTimeoutMillis,
        });

        // Errors on a connection that is *idle* in the pool - Postgres
        // restarting, the proxy dropping a quiet connection, a network blip -
        // surface here rather than on anyone's query, because no query owns
        // that connection at the time.
        //
        // This listener is not optional. 'error' on an EventEmitter with no
        // listener is rethrown by Node, so without it a routine database
        // restart takes the whole server down. The pool has already discarded
        // the connection by the time this runs and will open a fresh one on
        // demand, so there is nothing here to repair - only to record.
        pool.on('error', (err) => {
          logger.error('Idle database client errored', err);
        });

        return pool;
      },
    },
    DatabaseLifecycle,
  ],
  exports: [PG_POOL],
})
export class DatabaseModule {}
