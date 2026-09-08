import { IsString, Length, Matches } from 'class-validator';

export class RefreshTokenDto {
  // 32 random bytes as hex is exactly 64 lowercase hex characters, so anything
  // else is a stale client or someone probing - turned away before we hash it
  // or open the file
  @IsString()
  @Length(64, 64, { message: 'Invalid session token' })
  @Matches(/^[a-f0-9]{64}$/, { message: 'Invalid session token' })
  refreshToken!: string;
}
