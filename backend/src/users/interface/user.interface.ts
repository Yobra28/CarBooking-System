/* eslint-disable prettier/prettier */
import { Role } from '@prisma/client';
export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: Role;
}
