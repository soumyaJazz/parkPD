import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CompleteProfileDto } from './dto/complete-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
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

  /**
   * The same form, reopened. PUT because the screen sends every answer back,
   * so this replaces the profile rather than merging into it.
   *
   * Reading it needs no endpoint of its own: `GET /auth/me` already answers
   * with the whole row, and the app is holding that from launch.
   */
  @Put('profile')
  updateProfile(@Body() dto: UpdateProfileDto, @CurrentUser() user: User) {
    return this.profileService.updateProfile(user.id, dto);
  }
}
