/* eslint-disable prettier/prettier */
import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class InitiateStkDto {
  @IsString()
  @IsNotEmpty()
  bookingId: string;

  @IsString()
  @IsNotEmpty()
  phone: string; // MSISDN format 2547XXXXXXXX

  @IsNumber()
  @IsOptional()
  amount?: number; // if omitted, will use booking.totalPrice
}