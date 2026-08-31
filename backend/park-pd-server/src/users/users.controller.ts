import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { ProfileService } from './profile.service';

@Controller('users')
export class UsersController {
  constructor(private profileService: ProfileService) {}

  @Post('profile')
  // fills in an account that already exists, so 200 rather than Nest's
  // default 201 for a POST
  @HttpCode(HttpStatus.OK)
  completeProfile(@Body() dto: CompleteProfileDto) {
    return this.profileService.completeProfile(dto);
  }
}
