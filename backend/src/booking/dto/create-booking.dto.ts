/* eslint-disable prettier/prettier */
import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

class BookingVehicleDto {
  @IsString()
  @IsNotEmpty()
  vehicleId: string;

  @IsNotEmpty()
  @Type(() => Date)
  startDate: Date;

  @IsNotEmpty()
  @Type(() => Date)
  endDate: Date;

  @IsNumber()
  price: number;
}

export class CreateBookingDto {
  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  guestName?: string;

  @IsEmail()
  @IsOptional()
  guestEmail?: string;

  @IsString()
  @IsOptional()
  guestPhone?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingVehicleDto)
  vehicles: BookingVehicleDto[];

  @IsNumber()
  totalPrice: number;
}
