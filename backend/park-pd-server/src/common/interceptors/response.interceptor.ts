import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiPayload, ApiSuccessResponse, isApiPayload } from '../api-response';

/** Used when a handler returns a bare value instead of `{ message, data }`. */
const DEFAULT_MESSAGE = 'Request completed successfully.';

/**
 * Wraps every successful response in the success envelope, so no controller has
 * to remember to build it. A handler that returns `{ message, data }` supplies
 * its own copy; anything else keeps its value as `data` and gets the default.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (isApiPayload(payload)) {
          const { message, data } = payload as ApiPayload<T>;
          return { success: true, message, data: data ?? null };
        }
        return {
          success: true,
          message: DEFAULT_MESSAGE,
          data: payload ?? null,
        };
      }),
    );
  }
}
