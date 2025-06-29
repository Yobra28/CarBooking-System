/* eslint-disable prettier/prettier */
/* eslint-disable prettier/prettier */
import { Transmission, FuelType } from '@prisma/client';
import {
  IsString,
  IsInt,
  IsEnum,
  IsNumber,
  IsOptional,
  Min,
  IsUrl,
} from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  name: string;

  @IsString()
  @IsOptional() 
  make: string;

  @IsString()
  @IsOptional() 
  model: string;


  @IsString()
  @IsOptional()
  category: string;

  @IsEnum(Transmission)
  @IsOptional()
   transmission: Transmission;

   @IsInt()
   @IsOptional()
   total: number;

  @IsEnum(FuelType)
  @IsOptional() 
  fuelType: FuelType;

  @IsNumber()
  @IsOptional()
  @Min(0) 
  pricePerDay: number;

  @IsString()
  @IsOptional() 
  color: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  mileage: number;

  @IsOptional()
  @IsString()
  @IsUrl()
  images?: string;


  @IsString()
  @IsOptional()
  address: string;

  @IsString()
  @IsOptional()
  city: string;

  @IsString()
  @IsOptional()
  postalCode: string;

  
}
