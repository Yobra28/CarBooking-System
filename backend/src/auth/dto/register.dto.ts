/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-wrapper-object-types */
/* eslint-disable prettier/prettier */
/* eslint-disable prettier/prettier */
import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, IsEnum, IsPhoneNumber } from 'class-validator';
import { Role } from '@prisma/client';


export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsPhoneNumber()
  @IsOptional()
  phone: String;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}