import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from './common/database.module';
import type { ApiPayload } from './common/api-response';

/** What `/health` reports, beyond the status code the platform reads. */
export interface HealthReport {
  status: 'ok';
  database: 'up';
}

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  getHello(): string {
    return 'Hello World!';
  }

  /**
   * Whether this instance can actually serve a request.
   *
   * It takes a connection out of the pool and asks the database something,
   * because "the process is listening" and "the app works" are different
   * claims and only the second one is worth restarting a container over. Every
   * endpoint that matters reads or writes Postgres, so an instance that cannot
   * reach it has nothing to offer and should be pulled out of rotation rather
   * than left answering 500s.
   *
   * 503 rather than a 500 from the filter: this is a specific, expected,
   * usually temporary condition, and it is the code a platform's health check
   * is looking for.
   */
  async checkHealth(): Promise<ApiPayload<HealthReport>> {
    try {
      await this.pool.query('SELECT 1');
    } catch (err) {
      this.logger.error('Health check could not reach the database', err);
      throw new ServiceUnavailableException(
        'The service is temporarily unavailable. Please try again shortly.',
      );
    }

    return {
      message: 'Service is healthy.',
      data: { status: 'ok', database: 'up' },
    };
  }
}
