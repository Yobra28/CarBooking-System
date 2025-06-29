/* eslint-disable prettier/prettier */
import { Role } from 'generated/prisma/client';
export class UpdateUserDto {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: Role;
}
