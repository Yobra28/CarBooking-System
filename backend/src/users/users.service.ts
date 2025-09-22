/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

/* eslint-disable prettier/prettier */
import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './interface/user.interface';
import * as bcrypt from 'bcrypt';
import { Role } from 'generated/prisma/client';
import { UpdateUserDto } from './dto/upadate-user.dto';
@Injectable()
export class UsersService {
    user: any;
    constructor(private prismaservice: PrismaService) {}
    async create(data: CreateUserDto): Promise<User>{
        try {
      const existingUser = await this.prismaservice.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        throw new ConflictException(
          `User with email ${data.email} already exists`,
        );
      }


      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(data.password, saltRounds);

      const user = await this.prismaservice.user.create({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          password: hashedPassword,
          role: data.role || Role.CUSTOMER,
          isActive: true,
        },
      });

      console.log(`Created new user ${user.firstName} ${user.lastName} (ID: ${user.id})`);
      const userWithPhone = { ...user, phone: user.phone === null ? undefined : user.phone };
      return userWithPhone;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create user: ${error.message}`,
      );
    }
  }

  async findAll(): Promise<User[]> {
    try {
      const users = await this.prismaservice.user.findMany({
        orderBy: { id: 'asc' },
      });
      return users.map(u => ({ ...u, phone: u.phone === null ? undefined : u.phone }));
    } catch (error) {
      throw new InternalServerErrorException('Failed to retrieve users', error);
    }
  }



  async findByEmail(email: string): Promise<User> {
    try {
      const user = await this.prismaservice.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw new NotFoundException(`User with email ${email} not found`);
      }

      const userWithPhone = { ...user, phone: user.phone === null ? undefined : user.phone };
      return userWithPhone;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException('Failed to retrieve user');
    }
  }

  async update(id: string, data: UpdateUserDto): Promise<User> {
    try {
      const existingUser = await this.prismaservice.user.findUnique({
        where: { id },
      });

      if (!existingUser) {
        throw new NotFoundException(`User with id ${id} not found`);
      }

      if (data.email && data.email !== existingUser.email) {
        const emailConflict = await this.prismaservice.user.findUnique({
          where: { email: data.email },
        });

        if (emailConflict) {
          throw new ConflictException('Another user with this email exists');
        }
      }

    
      let hashedPassword: string | undefined;
      if (data.password) {
        const saltRounds = 10;
        hashedPassword = await bcrypt.hash(data.password, saltRounds);
      }

      const updatedUser = await this.prismaservice.user.update({
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

      const updatedUserWithPhone = { ...updatedUser, phone: updatedUser.phone === null ? undefined : updatedUser.phone };
      return updatedUserWithPhone;
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

  async findById(id: string) {
    return this.prismaservice.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

}
