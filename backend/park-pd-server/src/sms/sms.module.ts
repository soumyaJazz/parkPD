import { Module } from '@nestjs/common';
import { SmsService } from './sms.service';

@Module({
  providers: [SmsService],
  // AuthModule injects SmsService, and a provider is private to its module
  // until it's exported
  exports: [SmsService],
})
export class SmsModule {}
