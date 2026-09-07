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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global, so every service that stores something can inject the one pool
    // without each module in the tree importing this.
    DatabaseModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
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
