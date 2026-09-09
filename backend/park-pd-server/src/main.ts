import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { appEnv, environment } from './config';

const logger = new Logger('Bootstrap');

/**
 * Secrets that must be real everywhere, including on a laptop.
 *
 * All three are HMAC keys, and none of the code that uses them complains about
 * a weak one - `JwtService` will happily sign with a short secret, and
 * `OtpService` falls back to a string that is published in this repository.
 * A forgeable token fails silently and looks like nothing at all, so this is
 * the only place the mistake can be caught.
 */
const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'REFRESH_HASH_SECRET',
  'OTP_HASH_SECRET',
] as const;

/**
 * Browser origins allowed to call this API, as a comma-separated list.
 *
 * Only the web build needs this. The iOS and Android builds reach the network
 * through NSURLSession and OkHttp, which send no `Origin` header and enforce
 * no same-origin policy - CORS is a rule browsers apply to themselves, and a
 * native client is not a browser. So this is optional, and an app that ships
 * native-only can leave it unset.
 *
 * What that does not mean is that the API is unprotected without it. CORS has
 * never been what guards this server; the JWT guard is. CORS decides which
 * *websites* may read a response using the caller's ambient credentials, which
 * is a question only a browser can be asked.
 */
function corsOrigins(): string[] {
  return (process.env.FRONTEND_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Everything checked before the app is built, so a misconfiguration is a
 * refusal to boot with a sentence attached rather than a server that starts
 * and then fails one request at a time.
 */
function assertConfig(isProduction: boolean): void {
  // the most likely way to ship a catastrophic auth hole is forgetting a dev
  // flag - refuse to boot instead.
  //
  // The override below exists because a test deploy with no mail provider
  // behind it still has to be signed into. It is deliberately a second
  // variable rather than a looser check on the first: the property worth
  // keeping is that nothing left set by accident can open this on its own.
  // Someone has to write the words "in production" for it to happen.
  if (isProduction && process.env.OTP_DEV_CODE) {
    if (process.env.ALLOW_DEV_OTP_IN_PRODUCTION !== 'true') {
      throw new Error(
        'OTP_DEV_CODE must not be set in production. If this deploy is a ' +
          'test environment with no real accounts on it, set ' +
          'ALLOW_DEV_OTP_IN_PRODUCTION=true as well - and unset both before ' +
          'anyone real signs up.',
      );
    }

    // On every boot, not only when a code is generated: this is the line
    // someone reading these logs weeks from now needs to walk into.
    const rule = '='.repeat(64);
    logger.warn(rule);
    logger.warn(
      `AUTHENTICATION IS EFFECTIVELY OFF: every OTP is "${process.env.OTP_DEV_CODE}".`,
    );
    logger.warn(
      'Anyone who can reach this server can sign in as any account on it.',
    );
    logger.warn(
      'Unset OTP_DEV_CODE and ALLOW_DEV_OTP_IN_PRODUCTION before real users.',
    );
    logger.warn(rule);
  }

  // MAIL_ENABLED=false makes MailService log the code instead of sending it.
  // On a laptop that is the point; on a deployed server it means every email
  // signup silently waits for a code that was only ever written to the logs.
  // Not fatal - a deploy using OTP_DEV_CODE has no need of a mail provider -
  // but it is the one failure that looks like nothing at all from outside.
  if (isProduction && process.env.MAIL_ENABLED !== 'true') {
    logger.warn(
      'MAIL_ENABLED is not "true", so no email code will actually be sent. ' +
        'Codes are written to this log instead.',
    );
  }

  for (const name of REQUIRED_SECRETS) {
    const value = process.env[name];
    if (!value || value.length < 32) {
      throw new Error(
        `${name} must be set and at least 32 characters. ` +
          'Generate one with: openssl rand -hex 32',
      );
    }
  }
}

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';
  assertConfig(isProduction);

  // Which environment resolved, before anything else is logged - every line
  // after this one is only interpretable if you know which server it came
  // from, and which env files were in play.
  logger.log(`Starting in the "${appEnv}" environment`);

  // Typed as the Express app because `trust proxy` below is an Express
  // setting, and the generic Nest interface has no way to reach it.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Per-environment, so a deployed instance is not paying to print every
    // `debug` line a laptop wants. See src/config/environments.
    logger: [...environment.logLevels],
  });

  // Railway terminates TLS at its edge and forwards on, so the address this
  // process sees on the socket is the proxy's, identical for every caller.
  // Express only reads the real client out of X-Forwarded-For once it has been
  // told to trust the hop in front of it - and ThrottlerGuard keys on req.ip,
  // so without this every user in the world shares one rate-limit bucket and
  // the fourth person to request an OTP in a minute is refused.
  //
  // 1, not `true`: trusting every hop means believing an X-Forwarded-For the
  // caller wrote themselves, which hands them a fresh bucket per request and
  // is worse than not trusting at all. One hop is exactly what is in front of
  // us. Behind a second proxy - Cloudflare in front of Railway - this becomes
  // 2, not `true`.
  app.set('trust proxy', 1);

  // Sets the response headers a browser needs to be told about rather than
  // asked - HSTS, nosniff, a referrer policy - and drops the X-Powered-By
  // banner that otherwise advertises the framework to anyone scanning.
  app.use(
    helmet({
      // The default is `same-origin`, which is aimed at sites serving images
      // and scripts. This one serves JSON to a frontend on another origin,
      // and CORS is what governs who may read it.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

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

  // The iOS and Android builds are unaffected by everything in this block -
  // see `corsOrigins`. It exists for the react-native-web build, which is a
  // real browser page on a real origin and so plays by browser rules.
  const allowedOrigins = corsOrigins();
  if (isProduction && allowedOrigins.length === 0) {
    logger.warn(
      'FRONTEND_ORIGIN is not set. Native builds are unaffected, but no ' +
        'browser origin can call this API - including the web build.',
    );
  }

  app.enableCors({
    origin(origin, callback) {
      // No Origin header at all: a native build, the platform health check,
      // curl. There is no browser here to protect, and refusing these would
      // break the app while protecting nobody.
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.includes(origin));
    },
    // For the web build's benefit if it ever moves off Bearer tokens. The
    // native builds hold their tokens in AsyncStorage and send them in the
    // Authorization header, which no cookie policy touches.
    credentials: true,
  });

  // Without this, SIGTERM kills the process before onModuleDestroy runs and
  // the database pool's connections are left open until Postgres times them
  // out - which on a platform that redeploys by replacing the container means
  // a pile of dead connections against a server that caps how many it holds.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 8000);
}

bootstrap().catch((err: unknown) => {
  // Every throw on the way up is one of the guards above or the pool factory,
  // and each of them raises a sentence written to be read. Left unhandled, Node
  // prints it as a rejected promise and buries the sentence in a stack trace.
  logger.error(
    `Failed to start: ${err instanceof Error ? err.message : String(err)}`,
  );
  process.exit(1);
});
