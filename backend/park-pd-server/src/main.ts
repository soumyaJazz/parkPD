import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  // the most likely way to ship a catastrophic auth hole is forgetting a dev
  // flag - refuse to boot instead
  // the most likely way to ship a catastrophic auth hole is forgetting a dev
  // flag - refuse to boot instead
  if (process.env.NODE_ENV === 'production' && process.env.OTP_DEV_CODE) {
    throw new Error('OTP_DEV_CODE must not be set in production');
  }

  // same class of mistake: a weak or missing secret on either of these means
  // forgeable tokens. Neither the signer nor the hasher complains about one,
  // so this is the only place that catches it.
  for (const name of ['JWT_SECRET', 'REFRESH_HASH_SECRET']) {
    const value = process.env[name];
    if (!value || value.length < 32) {
      throw new Error(
        `${name} must be set and at least 32 characters. ` +
          'Generate one with: openssl rand -hex 32',
      );
    }
  }

  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips undeclared props, so no { email, isAdmin: true }
      forbidNonWhitelisted: true, // 400 instead of silently dropping - catches field-name mismatches
      transform: true, // turns the JSON body into a real DTO instance, which is what makes the validators run
    }),
  );

  // every response leaves through these two: the interceptor puts a `message`
  // on the successes, the filter puts one on everything thrown - so the client
  // always has something it can show
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // backend is :8000, frontend :3000 - different origins, so the browser
  // blocks the request unless the server opts in
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
    credentials: true, // needed later when JWT moves to httpOnly cookies
  });

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
