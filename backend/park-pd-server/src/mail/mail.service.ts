import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * The audience is 60+, often reading this on a phone held at arm's length, so
 * the same rules the app's screens follow apply to the mail too: 18px body,
 * near-black on off-white, and the code itself large enough to read without
 * squinting. See CLAUDE.md.
 *
 * Inline styles and a table, not a stylesheet: mail clients strip <style>
 * blocks unpredictably, and Outlook ignores most of what survives.
 */
function otpEmailHtml(otp: string, expiryMinutes: number): string {
  const body =
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;' +
    'font-size:18px;line-height:1.6;color:#1A1A1A;';

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#FAFAF8;${body}">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
           style="max-width:520px;margin:0 auto;background:#FFFFFF;
                  border:1px solid #D4D4D0;border-radius:12px;">
      <tr>
        <td style="padding:32px;text-align:left;${body}">
          <p style="margin:0 0 20px;${body}">Here is your ParkPD code.</p>

          <p style="margin:0 0 20px;font-family:inherit;font-size:44px;
                    font-weight:700;letter-spacing:10px;color:#1A1A1A;">${otp}</p>

          <p style="margin:0 0 20px;${body}">
            Type this code into the app to continue.
            It stops working in ${expiryMinutes} minutes.
          </p>

          <p style="margin:0;${body}">
            If you did not ask for this code, you can ignore this email.
            Nobody can use it without your phone.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly enabled: boolean;
  private readonly expiryMinutes: number;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('MAIL_ENABLED') === 'true';

    this.expiryMinutes = Number(
      this.configService.get<string>('OTP_EXPIRY_MINUTES', '5'),
    );

    const port = Number(this.configService.get<string>('MAIL_PORT', '465'));

    // built once, not per email: nodemailer pools connections, so creating
    // a transporter per send means a fresh TLS handshake every time
    this.transporter = this.enabled
      ? nodemailer.createTransport({
          host: this.configService.get<string>('MAIL_HOST'),
          port,
          // Read off the port rather than fixed: 465 is implicit TLS,
          // 587 and 2587 open in the clear and upgrade with STARTTLS.
          // Hardcoding `true` made every provider that only offers 587 -
          // which is most of them - hang until the socket timed out.
          secure: port === 465 || port === 2465,
          auth: {
            user: this.configService.get<string>('MAIL_USER'),
            pass: this.configService.get<string>('MAIL_PASS'),
          },
        })
      : null;
  }

  /**
   * Checks the credentials once at boot instead of leaving the first real
   * signup to discover them. Deliberately not fatal: mail being down is not
   * a reason to take the whole API with it, and the send path already turns
   * a failure into a sentence the user can act on.
   */
  onModuleInit(): void {
    if (!this.transporter) {
      return;
    }

    this.transporter
      .verify()
      .then(() =>
        this.logger.log(
          `Mail ready: ${this.configService.get<string>('MAIL_HOST')}`,
        ),
      )
      .catch((err: unknown) =>
        this.logger.error(
          'MAIL_ENABLED is true but the SMTP server rejected us - ' +
            'email codes will not arrive. ' +
            `Check MAIL_HOST/MAIL_PORT/MAIL_USER/MAIL_PASS: ${
              err instanceof Error ? err.message : String(err)
            }`,
        ),
      );
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    if (!this.enabled || !this.transporter) {
      // lets you build the whole flow without sending real mail
      this.logger.warn(`[DEV] OTP for ${email} is ${otp}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: `Your ParkPD code is ${otp}`,
      text:
        `Here is your ParkPD code: ${otp}\n\n` +
        `Type this code into the app to continue. ` +
        `It stops working in ${this.expiryMinutes} minutes.\n\n` +
        `If you did not ask for this code, you can ignore this email.`,
      html: otpEmailHtml(otp, this.expiryMinutes),
    });
  }
}
