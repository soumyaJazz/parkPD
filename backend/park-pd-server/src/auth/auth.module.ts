import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RefreshTokenService } from './refresh-token.service';
import { OtpModule } from '../otp/otp.module';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    OtpModule,
    MailModule,
    UsersModule,
    // registerAsync, not register: register() is evaluated while the module
    // tree is being built, which can run before ConfigModule has read .env.
    // JwtService would then be handed an undefined secret - and sign with it
    // anyway, producing tokens nothing can verify.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        // applied to every signAsync call, so no caller has to remember it.
        //
        // The cast is load-bearing: @types/jsonwebtoken types expiresIn as a
        // template-literal union ("15m", "2 days", ...), never a plain string,
        // and an env var is only ever a plain string to the compiler.
        signOptions: {
          expiresIn: config.get<string>(
            'JWT_EXPIRES_IN',
            '15m',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  // RefreshTokenService is provided here rather than given its own module the
  // way OtpService was: nothing outside auth has any business reading it
  providers: [AuthService, RefreshTokenService],
  // re-exported so the global guard, which is provided by AppModule, can
  // inject JwtService without configuring the secret a second time
  exports: [JwtModule],
})
export class AuthModule {}
