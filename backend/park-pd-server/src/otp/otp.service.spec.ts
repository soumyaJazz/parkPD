import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PG_POOL } from '../common/database.module';
import { OtpService } from './otp.service';

describe('OtpService', () => {
  let service: OtpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      // OtpService reads its expiry/attempt limits through ConfigService
      imports: [ConfigModule],
      // A stub pool: this asserts the provider wiring, and nothing here
      // reaches the database.
      providers: [OtpService, { provide: PG_POOL, useValue: {} }],
    }).compile();

    service = module.get<OtpService>(OtpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
