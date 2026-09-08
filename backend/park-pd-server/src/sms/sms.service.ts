import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sends the one-time code to a mobile number.
 *
 * Shaped like MailService on purpose - the auth service picks between the two
 * by the method the user chose, and should not have to tell them apart.
 *
 * No SMS provider is wired up yet. Everything around this - the account model,
 * both flows, the screens - is finished and does not care which one fills the
 * gap, so adding a provider is a change to this file and nothing else.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly enabled: boolean;
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('SMS_ENABLED') === 'true';
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * Throws rather than resolving quietly when it cannot send: the caller turns
   * a throw into "we could not send the code", and a silent success into a
   * code the user waits for and never receives.
   */
  sendOtp(phone: string, otp: string): Promise<void> {
    if (this.enabled) {
      // TODO(sms): the provider goes here. It needs the number in the form it
      // is stored in - digits, with a leading '+' where a country code was
      // given - and the message body is
      // `Your parkPD code is ${otp}. It expires in 5 minutes.`
      this.logger.error(
        'SMS_ENABLED is true but no SMS provider is configured.',
      );
      throw new ServiceUnavailableException(
        'We could not send the code by text message. Please try again.',
      );
    }

    // Printing a live code is a development convenience and nothing else. In
    // production it would put every account's credential in the server log,
    // so there it is a refusal rather than a fallback.
    if (this.isProduction) {
      this.logger.error(
        'SMS_ENABLED is not set, so no code can be sent to a mobile number.',
      );
      throw new ServiceUnavailableException(
        'We cannot send a code by text message right now. Please use your email address instead.',
      );
    }

    this.logger.warn(`[DEV] OTP for ${phone} is ${otp}`);
    return Promise.resolve();
  }
}
