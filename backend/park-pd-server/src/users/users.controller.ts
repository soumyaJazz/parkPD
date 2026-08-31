import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { ProfileService } from './profile.service';
import type { User } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private profileService: ProfileService) {}

  @Post('profile')
  // fills in an account that already exists, so 200 rather than Nest's
  // default 201 for a POST
  @HttpCode(HttpStatus.OK)
  completeProfile(
    @Body() dto: CompleteProfileDto,
    // the account comes from the verified token, never from the body - a
    // caller can change what they send, not who the token says they are
    @CurrentUser() user: User,
  ) {
    return this.profileService.completeProfile(user.id, dto);
  }
}
