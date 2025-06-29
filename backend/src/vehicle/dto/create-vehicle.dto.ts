/* eslint-disable prettier/prettier */
/* eslint-disable prettier/prettier */
import { Transmission, FuelType } from '@prisma/client';
import {
  IsString,
  IsInt,
  IsEnum,
  IsNumber,
  IsUrl,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  name: string;

  @IsString() 
  make: string;

  @IsString() 
  model: string;

  @IsString()
  category: string;

  @IsEnum(Transmission)
   transmission: Transmission;

  @IsInt()
  total: number;
  

  @IsEnum(FuelType) 
  fuelType: FuelType;

   @IsNumber() 
   pricePerDay: number;
   
      @IsString() 
  color: string;



  @IsInt()
  mileage: number;

  @IsString()
  @IsUrl()
  images: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsString()
  postalCode: string;
}