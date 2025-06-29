/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import { Body, ConflictException, Controller, InternalServerErrorException, NotFoundException, Param, Post, Put, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './interface/user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiResponse } from './shared/ApiResponse/api-response.interface';
import { Role } from 'generated/prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/upadate-user.dto';

@Controller('users')
export class UsersController {
    prismaservice: any;
    constructor(private userservice:UsersService) {}
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
      // Check if user exists
      const existingUser = await this.prismaservice.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      // Check for email conflicts if email is being updated
      if (data.email && data.email !== existingUser.email) {
        const emailConflict = await this.prismaservice.user.findUnique({
          where: { email: data.email },
        });

        if (emailConflict) {
          throw new ConflictException('Another user with this email exists');
        }
      }

      // Hash password if provided
      let hashedPassword: string | undefined;
      if (data.password) {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash(data.password, saltRounds);
      }

      const updatedUser = await this.userservice.user.update({
        where: { id },
        data: {
          ...(data.firstName && { firstName: data.firstName }),
          ...(data.lastName && { lastName: data.lastName }),
          ...(data.email && { email: data.email }),
          ...(data.phone !== undefined && { phone: data.phone }),
          ...(hashedPassword && { password: hashedPassword }),
          ...(data.role && { role: data.role }),
        },
      });

      return updatedUser;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to update user');
    }
  }
      
}
