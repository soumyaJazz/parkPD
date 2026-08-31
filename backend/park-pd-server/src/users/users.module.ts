import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
    controllers: [UsersController],
    providers: [UsersService, ProfileService],
    exports: [UsersService],
})
export class UsersModule {}
