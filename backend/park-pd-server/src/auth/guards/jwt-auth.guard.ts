import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../../users/users.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthenticatedRequest } from '../authenticated-request';
import type { JwtPayload } from '../auth.service';

/**
 * One line for every rejection. Which part failed - missing header, bad
 * signature, expired, deleted account - is a detail only an attacker benefits
 * from, and the user's next move is the same in all four cases.
 */
const REJECTED = 'Your session has ended. Please sign in again.';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // getAllAndOverride, not get: it reads the handler first and falls back to
    // the controller, so @Public() works on a single route or a whole class
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException({
        message: REJECTED,
        reason: 'no-token',
      });
    }

    let payload: JwtPayload;
    try {
      // verifyAsync checks the signature and the exp claim, and throws on
      // either. The secret comes from the JwtModule config in AuthModule.
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException({
        message: REJECTED,
        reason: 'invalid-token',
      });
    }

    // a valid signature only proves the token wasn't edited. It does not prove
    // the account still exists - users.json can lose a row, and without this
    // check a deleted user keeps full access until their token expires.
    const user = this.usersService.findById(payload.sub);
    if (!user || user.email !== payload.email) {
      throw new UnauthorizedException({
        message: REJECTED,
        reason: 'no-account',
      });
    }

    request.user = user;
    return true;
  }

  /** Reads `Authorization: Bearer <token>`, ignoring any other scheme. */
  private extractToken(request: AuthenticatedRequest): string | undefined {
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    return scheme === 'Bearer' ? token : undefined;
  }
}
