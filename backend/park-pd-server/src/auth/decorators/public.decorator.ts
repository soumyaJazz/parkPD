import { SetMetadata } from '@nestjs/common';

/** Metadata key the global JwtAuthGuard reads. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as reachable without an access token.
 *
 * The guard is global, so everything is protected unless it opts out here.
 * That direction is deliberate: forgetting this decorator breaks a route
 * loudly in dev, where forgetting a @UseGuards would have quietly shipped an
 * open endpoint. Same trade as forbidNonWhitelisted in main.ts.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
