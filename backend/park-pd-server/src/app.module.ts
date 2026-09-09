import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { DatabaseModule } from './common/database.module';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { LogsModule } from './logs/logs.module';
import { appEnv, envFilePathsFor, environment } from './config';

@Module({
  imports: [
    // `.env.<env>` first, then `.env` - see src/config/app-env.ts. Real
    // environment variables still win over both, which is what leaves a
    // Railway deploy (where no file is present) behaving exactly as before.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: envFilePathsFor(appEnv),
    }),
    // Global, so every service that stores something can inject the one pool
    // without each module in the tree importing this.
    DatabaseModule,
    // Two limits, counted separately, both of which a request has to satisfy.
    //
    // 'ip' is the blunt one: it stops a single host hammering the server. It
    // has to be generous, because this is a phone app and mobile carriers put
    // thousands of subscribers behind one public address - a limit sized for
    // one person would lock out everyone sharing their carrier.
    //
    // 'identity' is the sharp one, and it is where the real protection now
    // lives: the auth routes override its tracker to count per contact, per
    // challenge or per device, none of which address sharing can blur. Left
    // alone it counts by address with a ceiling nothing legitimate reaches, so
    // an ordinary route is governed by 'ip' and this does nothing. See
    // src/auth/throttle-trackers.ts for why it is a second limit and not a
    // replacement.
    //
    // The numbers themselves are per-environment and live in
    // src/config/environments - a laptop gets limits nothing hits by accident,
    // while `test` deliberately keeps production's so staging fails the way
    // production would.
    ThrottlerModule.forRoot([
      { name: 'ip', ...environment.throttle.ip },
      { name: 'identity', ...environment.throttle.identity },
    ]),
    AuthModule,
    // the global guard below injects UsersService; AuthModule re-exports
    // JwtModule for the same reason
    UsersModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // registration order is execution order. Rate limiting first means a
    // flood of junk tokens is rejected before we spend a signature check and
    // a file read on each one.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
