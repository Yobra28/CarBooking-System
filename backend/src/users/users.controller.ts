/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Body, ConflictException, Controller, Get, Delete, InternalServerErrorException, NotFoundException, Param, Post, Put, Patch, UseGuards, Req, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './interface/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponse } from './shared/ApiResponse/api-response.interface';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/upadate-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
    prismaservice: any;
    constructor(private userservice:UsersService) {}

    @Get()
    async findAll(): Promise<User[]> {
      return this.userservice.findAll();
    }

    @Post()
    async create(@Body() data: CreateUserDto): Promise<ApiResponse<User>> {
    try {
      const user = await this.userservice.create(data);
      const { password, ...userWithoutPassword } = user;
      return {
        sucess: true,
        message: 'User created successfully',
        data: userWithoutPassword as User,
      };
    } catch (error) {
      return {
        sucess: false,
        message: 'Failed to create user',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
//    Get()
//   async findAll(): Promise<User[]> {
//     try {
//       const users = await this.userservice.user.findMany({
//         orderBy: { id: 'asc' },
//       });
//       return users;
//     } catch (error) {
//       throw new InternalServerErrorException('Failed to retrieve users', error);
//     }
//   }


@Put(':id')
  async update(
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
  ): Promise<User> {
    try {
      return await this.userservice.update(id, data);
    } catch (error) {
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.userservice.remove(id);
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete user');
    }
  }

  // Authenticated self endpoints
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: any) {
    return this.userservice.findById(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(@Req() req: any, @Body() data: UpdateUserDto) {
    return this.userservice.update(req.user.id, data);
  }

  // Submit KYC documents (driver license, national ID, live profile photo)
  @Post('me/kyc')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'driverLicense', maxCount: 1 },
      { name: 'nationalId', maxCount: 1 },
      { name: 'liveProfile', maxCount: 1 },
    ]),
  )
  async submitKyc(
    @Req() req: any,
    @UploadedFiles()
    files: {
      driverLicense?: Express.Multer.File[];
      nationalId?: Express.Multer.File[];
      liveProfile?: Express.Multer.File[];
    },
  ) {
    return this.userservice.submitKyc(req.user.id, files);
  }

  // Admin/Agent: view a user's KYC
  @Get(':id/kyc')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT')
  async getUserKyc(@Param('id') id: string) {
    return this.userservice.getKyc(id);
  }

  // Admin/Agent: approve a user's KYC
  @Patch(':id/kyc/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT')
  async approveUserKyc(@Param('id') id: string) {
    return this.userservice.approveKyc(id);
  }

  // Admin/Agent: reject/reset a user's KYC
  @Patch(':id/kyc/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'AGENT')
  async rejectUserKyc(@Param('id') id: string) {
    return this.userservice.rejectKyc(id);
  }
}
