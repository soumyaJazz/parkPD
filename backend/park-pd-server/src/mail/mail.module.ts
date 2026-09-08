import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  // AuthModule injects MailService, and a provider is private to its module
  // until it's exported
  exports: [MailService],
})
export class MailModule {}
