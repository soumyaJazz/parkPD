import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiErrorResponse } from '../api-response';

/** Shown instead of a raw exception, which is never fit for the UI. */
const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/** The throttler guard names its own exception class - not user-facing copy. */
const THROTTLED_MESSAGE =
  'Too many requests. Please wait a moment and try again.';

/** The body Nest puts inside an HttpException. */
type ExceptionBody = {
  message?: string | string[];
  error?: string;
  [key: string]: unknown;
};

/**
 * Turns anything thrown into the error envelope, so a failure is as readable to
 * the client as a success: `message` is what the UI shows, `error` carries the
 * detail that would be noise (or a leak) on screen.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const status: HttpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const { message, details } = this.describe(exception, status);

    const body: ApiErrorResponse = {
      success: false,
      statusCode: status,
      message,
      error: {
        // e.g. 429 -> TOO_MANY_REQUESTS; a stable string for the client to
        // branch on without hard-coding numbers
        code: HttpStatus[status] ?? 'ERROR',
        ...(details === undefined ? {} : { details }),
      },
    };

    response.status(status).json(body);
  }

  private describe(
    exception: unknown,
    status: HttpStatus,
  ): { message: string; details?: unknown } {
    if (!(exception instanceof HttpException)) {
      // an unexpected throw can carry anything, including internals - keep the
      // detail in the log and hand the client something safe
      this.logger.error('Unhandled exception', exception as Error);
      return { message: FALLBACK_MESSAGE };
    }

    const payload = exception.getResponse();
    let message: string | undefined;
    let details: unknown;

    if (typeof payload === 'string') {
      // HttpException built from a bare string, which is what the throttler
      // guard and our own HttpException(...) calls produce
      message = payload;
    } else {
      const body = payload as ExceptionBody;
      const raw = body.message;
      // statusCode/error are Nest's own scaffolding and already covered by the
      // envelope - only anything a thrower added is worth passing on
      const rest = Object.fromEntries(
        Object.entries(body).filter(
          ([key]) => !['message', 'statusCode', 'error'].includes(key),
        ),
      );

      if (Array.isArray(raw)) {
        // ValidationPipe reports every broken rule at once; the field messages
        // are written for humans, so the first one is the one to show and the
        // rest stay available under `error.details`
        message = raw[0];
        details = raw;
      } else {
        message = raw;
        details = Object.keys(rest).length > 0 ? rest : undefined;
      }
    }

    // our own cooldown message says how long to wait; only the guard's generic
    // one - which names its exception class - needs replacing
    if (
      status === HttpStatus.TOO_MANY_REQUESTS &&
      (!message || message.startsWith('ThrottlerException'))
    ) {
      return { message: THROTTLED_MESSAGE };
    }

    return { message: message ?? FALLBACK_MESSAGE, details };
  }
}
