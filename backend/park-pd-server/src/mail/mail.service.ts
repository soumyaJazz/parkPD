import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Resend's transactional send endpoint.
 *
 * HTTPS on 443, deliberately, rather than the SMTP relay this service used to
 * talk to. Railway blocks outbound SMTP (25, 465, 587) on every plan below Pro,
 * and blocks it by swallowing the traffic rather than refusing it - so the
 * symptom was not an error but an eight-second stall, followed by a 503 that
 * described a passing outage rather than a port that is never going to open.
 * Nothing on the free, trial or hobby tier of any comparable host is different;
 * 443 is the one port that is always open.
 */
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * How long we wait for Resend before giving up on a code.
 *
 * `sendOtp` is awaited before the request returns, so this number is inside the
 * client's own 15s budget (`API_TIMEOUT_MS`) and has to leave room for the rest
 * of the round trip. Eight seconds is generous for a single HTTPS POST and
 * still lands the user on a sentence they can act on rather than on the
 * client's "the server took too long", which tells them nothing.
 */
const SEND_TIMEOUT_MS = 8000;

/** What Resend puts in the body of a non-2xx response. */
type ResendError = {
  readonly name?: string;
  readonly message?: string;
};

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
  private readonly enabled: boolean;
  private readonly apiKey: string | undefined;
  private readonly from: string | undefined;
  private readonly expiryMinutes: number;

  /**
   * True when the key was read from the old SMTP variable. Only used to say so
   * once at boot - see `onModuleInit`.
   */
  private readonly usingLegacyKeyVar: boolean;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<string>('MAIL_ENABLED') === 'true';

    this.expiryMinutes = Number(
      this.configService.get<string>('OTP_EXPIRY_MINUTES', '5'),
    );

    // MAIL_PASS held this same `re_...` key back when it was an SMTP password,
    // so it is read as a fallback: the deploy that first runs this file already
    // has it set, and a fix for "no email can be sent" should not also require
    // getting a dashboard edit right before it works.
    const apiKeyVar = this.configService.get<string>('MAIL_API_KEY');
    const legacyVar = this.configService.get<string>('MAIL_PASS');
    this.apiKey = apiKeyVar || legacyVar;
    this.usingLegacyKeyVar = !apiKeyVar && Boolean(legacyVar);

    this.from = this.configService.get<string>('MAIL_FROM');
  }

  /**
   * Checks the configuration once at boot instead of leaving the first real
   * signup to discover it.
   *
   * Config only - nothing is sent to Resend here. The obvious probe is a GET to
   * /api-keys, but a *sending* key is not allowed to read that, so the check
   * best suited to catching a bad key would fail on a perfectly good one, and
   * the boot log would cry wolf on every deploy. What a send actually needs is
   * a key and a verified `from`, and both of those can be checked from here.
   *
   * Deliberately not fatal: mail being misconfigured is not a reason to take
   * the whole API with it, and the send path already turns a failure into a
   * sentence the user can act on.
   */
  onModuleInit(): void {
    if (!this.enabled) {
      return;
    }

    if (!this.apiKey) {
      this.logger.error(
        'MAIL_ENABLED is true but no API key is set - email codes will not ' +
          'arrive. Set MAIL_API_KEY to a Resend key (it starts with "re_").',
      );
      return;
    }

    if (!this.apiKey.startsWith('re_')) {
      this.logger.warn(
        'The mail API key does not look like a Resend key - they start with ' +
          '"re_". Sending will fail if this is the wrong value.',
      );
    }

    if (this.usingLegacyKeyVar) {
      this.logger.warn(
        'Reading the Resend key from MAIL_PASS, which is the old SMTP name. ' +
          'Rename it to MAIL_API_KEY - the fallback will not be kept forever. ' +
          'MAIL_HOST, MAIL_PORT and MAIL_USER are no longer read at all and ' +
          'can be deleted.',
      );
    }

    if (!this.from) {
      this.logger.error(
        'MAIL_ENABLED is true but MAIL_FROM is not set - Resend rejects a ' +
          'send with no sender. Use: ParkPD <noreply@your-verified-domain>',
      );
      return;
    }

    this.logger.log(`Mail ready: sending as ${this.from} via Resend`);
  }

  async sendOtp(email: string, otp: string): Promise<void> {
    if (!this.enabled) {
      // lets you build the whole flow without sending real mail
      this.logger.warn(`[DEV] OTP for ${email} is ${otp}`);
      return;
    }

    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey ?? ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: email,
          // The code is in the subject on purpose: it shows up in the phone's
          // notification and in the inbox list, so most people never have to
          // open the mail at all.
          subject: `Your ParkPD code is ${otp}`,
          text:
            `Here is your ParkPD code: ${otp}\n\n` +
            `Type this code into the app to continue. ` +
            `It stops working in ${this.expiryMinutes} minutes.\n\n` +
            `If you did not ask for this code, you can ignore this email.`,
          html: otpEmailHtml(otp, this.expiryMinutes),
        }),
        // fetch waits indefinitely by default, and an unanswered request would
        // hang the whole sign-in rather than fail it.
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });

      if (!response.ok) {
        await this.logRejection(response);
        throw new Error(`Resend returned ${response.status}`);
      }

      // Resend's id, so a delivery question later ("they say it never came")
      // can be answered from its dashboard rather than guessed at. The code
      // itself is never logged on this path - only on the disabled one above,
      // where there is no mail to read it from.
      const { id } = (await response.json()) as { id?: string };
      this.logger.log(`Code sent to ${email} (Resend id ${id ?? 'unknown'})`);
    } catch (err: unknown) {
      // The transport's own wording - "TimeoutError", a 422 body - is for
      // whoever reads these logs, never for someone waiting on a screen.
      if (err instanceof Error && err.name === 'TimeoutError') {
        this.logger.error(
          `Sending the code to ${email} timed out after ${SEND_TIMEOUT_MS}ms. ` +
            'Resend was unreachable or did not answer in time.',
        );
      } else if (err instanceof TypeError) {
        // fetch reports every network-level failure as TypeError: DNS, TLS,
        // refused connections. On a host that filters outbound traffic this is
        // the line that says so.
        this.logger.error(
          `Sending the code to ${email} failed before Resend answered: ` +
            `${err.message}. This is a network failure, not a rejected email.`,
        );
      } else {
        this.logger.error(
          `Sending the code to ${email} failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      // 503, not 500: this is a dependency being unreachable, which is usually
      // temporary, and the sentence says so plainly and gives the one action
      // that helps. Throwing rather than resolving is deliberate - a silent
      // success here is a person waiting for a code that was never sent.
      throw new ServiceUnavailableException(
        'We could not send your code right now. Please wait a minute and try again.',
      );
    }
  }

  /**
   * Turns a non-2xx from Resend into a log line that names the actual cause.
   *
   * The two that are not passing outages get called out by name, because the
   * user-facing sentence - "wait a minute and try again" - describes them
   * wrongly, and unless the log says otherwise they read like an outage that
   * will clear on its own while nobody looks for the real reason.
   */
  private async logRejection(response: Response): Promise<void> {
    let detail = '';
    try {
      const body = (await response.json()) as ResendError;
      detail = body.message ?? body.name ?? '';
    } catch {
      // A non-JSON body (a proxy's HTML error page, say) is still worth having.
      detail = (await response.text().catch(() => '')).slice(0, 200);
    }

    this.logger.error(
      `Resend rejected the send: HTTP ${response.status}${
        detail ? ` - ${detail}` : ''
      }`,
    );

    if (response.status === 401 || response.status === 403) {
      this.logger.error(
        'Resend rejected our API key, so no email code can be sent and ' +
          'retrying will not help. The key in MAIL_API_KEY was deleted or ' +
          'rotated - issue a new one with sending access.',
      );
    }

    if (response.status === 422) {
      this.logger.error(
        `Resend refused the sender "${this.from ?? ''}". Retrying will not ` +
          'help. The domain in MAIL_FROM must be one verified on this Resend ' +
          'account, with its DNS records still in place.',
      );
    }
  }
}
