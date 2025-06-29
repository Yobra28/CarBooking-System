/* eslint-disable prettier/prettier */
/* eslint-disable prettier/prettier */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import {
  RegisterDto
} from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequestPasswordResetDto } from './dto/reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Role } from 'generated/prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

 
  private generateResetCode(): number {
    return Math.floor(100000 + Math.random() * 900000);
  }

  async register(registerDto: RegisterDto) {
    const {
      email,
      password,
      firstName,
      lastName,
      role = Role.CUSTOMER,
    } = registerDto;

    
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

 
    const hashedPassword = await bcrypt.hash(password, 12);

    
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

 
    // try {
    //   await this.emailService.sendWelcomeEmail(user.email, user.firstName);
    // } catch (error) {
    //   console.log('Email sending failed, but registration successful:', error.message);
    // }

   
    const token = this.generateToken(user.id, user.email, mapPrismaRoleToCustomRole(user.role));

    return {
      user,
      token,
      message: 'Registration successful',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

   
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

   
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    
    const token = this.generateToken(user.id, user.email, mapPrismaRoleToCustomRole(user.role));

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      token,
      message: 'Login successful',
    };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    console.log('Password reset requested for email:', dto.email);
    
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      console.log('User not found for email:', dto.email);
      return {
        message:
          'We have sent a password reset code.',
      };
    }

    console.log('User found:', { id: user.id, firstName: user.firstName, email: user.email });
    
    const code = this.generateResetCode();
    const expiresAt = new Date(Date.now() + 3600000); 

    console.log('Generated reset code:', code);
    console.log('Expires at:', expiresAt);

    await this.prisma.passwordReset.create({
      data: {
        email: dto.email,
        code,
        expiresAt,
      },
    });

    console.log('Password reset record created in database');

    console.log('Calling email service...');
    const emailResult = await this.emailService.sendPasswordResetEmail(
      dto.email,
      user.firstName,
      code.toString(),
    );
    
    console.log('Email service result:', emailResult);

    return {
      message:
        'We have sent a password reset code.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { code, newPassword } = dto;

    
    const resetRecord = await this.prisma.passwordReset.findFirst({
      where: {
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetRecord) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    
    const hashedPassword = await bcrypt.hash(newPassword, 12);


    await this.prisma.user.update({
      where: { email: resetRecord.email },
      data: { password: hashedPassword },
    });


    await this.prisma.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });

    return { message: 'Password reset successful' };
  }

  private generateToken(userId: string, email: string, role: Role) {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN'),
    });
  }
}


function mapPrismaRoleToCustomRole(prismaRole: string): Role {
  switch (prismaRole) {
    case 'ADMIN':
      return Role.ADMIN;
    case 'AGENT':
      return Role.AGENT;
    case 'CUSTOMER':
      return Role.CUSTOMER;
    default:
      return Role.CUSTOMER;
  }
}
