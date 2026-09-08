import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from '../authenticated-request';
import type { User } from '../../users/users.service';

/**
 * Hands the handler the account the guard already resolved, so controllers
 * never reach into an untyped request object.
 *
 * The non-null assertion is safe only because the guard runs first and throws
 * on every path that would leave `user` unset - so this is valid on protected
 * routes and meaningless on a @Public() one.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user!;
  },
);
