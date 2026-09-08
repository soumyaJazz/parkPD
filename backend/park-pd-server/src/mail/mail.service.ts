import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly logger = new Logger(MailService.name);
    private readonly transporter: nodemailer.Transporter | null;
    private readonly enabled: boolean;

    constructor(private configService: ConfigService) {
        this.enabled = this.configService.get<string>('MAIL_ENABLED') === 'true';

        // built once, not per email: nodemailer pools connections, so creating
        // a transporter per send means a fresh TLS handshake every time
        this.transporter = this.enabled
            ? nodemailer.createTransport({
                host: this.configService.get<string>('MAIL_HOST'),
                port: Number(this.configService.get<string>('MAIL_PORT', '465')),
                secure: true, // port 465 is implicit TLS; set false for 587
                auth: {
                    user: this.configService.get<string>('MAIL_USER'),
                    pass: this.configService.get<string>('MAIL_PASS'),
                },
            })
            : null;
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
            subject: 'Your ParkPD verification code',
            text: `Your code is ${otp}. It expires in 5 minutes.`,
            html: `<p>Your code is <b style="font-size:20px">${otp}</b></p>
                   <p>It expires in 5 minutes. If you didn't request this, ignore this email.</p>`,
        });
    }
}
