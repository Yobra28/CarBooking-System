/* eslint-disable prettier/prettier */
import { FuelType, Transmission } from '@prisma/client';

export interface Vehicle {
  id: string;
  name: string;
  make: string;
  model: string;
  category: string;
  transmission: Transmission;
  total: number;
  fuelType: FuelType;
  pricePerDay: number;
  color: string;
  mileage: number;
  images: string;
  address: string;
  city: string;
  postalCode: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;

}
