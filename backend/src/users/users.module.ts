/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [UsersController],
  exports: [UsersService],
  providers: [UsersService],
})
export class UsersModule {}

