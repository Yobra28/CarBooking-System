/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */


import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './interface/vehicle.interface';
import { isUUID } from 'class-validator';

@Injectable()
export class VehicleService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateVehicleDto): Promise<Vehicle> {
    try {
      const existingColor = await this.prisma.vehicle.findFirst({
        where: { color: data.name },
      });

      if (existingColor) {
        throw new ConflictException(
          `Car with color ${data.name} already exists`,
        );
      }
      const vehicle = await this.prisma.vehicle.create({
        data: {
          name: data.name,
          make: data.make,
          model: data.model,
          category: data.category,
          transmission: data.transmission,
          total: (data.total),
          fuelType: data.fuelType,
          pricePerDay: data.pricePerDay,
          color: data.color,
          mileage: data.mileage,
          images: data.images,
          address: data.address,
          city: data.city,
          postalCode: data.postalCode,
        },
      });
      console.log(`Created new user ${vehicle.name} (ID: ${vehicle.id})`);
      return vehicle;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create vehicle: ${error.message}`,
      );
    }
  }

  async findAll(search?: string) {
  const where = search
  ? {
      isAvailable: true,
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { color: { contains: search, mode: 'insensitive' as const } },
        { model: { contains: search, mode: 'insensitive' as const } },
      ],
    }
  : { isAvailable: true };

  return this.prisma.vehicle.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

async findOne(search: string) {
  if (isUUID(search)) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: search } });
    if (!vehicle) {
      throw new NotFoundException('vehicle not found');
    }
    return vehicle;
  }
  const vehicle = await this.prisma.vehicle.findFirst({
    where: {
      OR: [
        { name: { equals: search, mode: 'insensitive' as const } },
        { model: { equals: search, mode: 'insensitive' as const } },
        { make: { equals: search, mode: 'insensitive' as const } },
      ],
    },
  });
  if (!vehicle) {
    throw new NotFoundException('vehicle not found');
  }
  return vehicle;
}

  
 

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException('vehicle not found');
    }
    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
    });
  }

async delete(id: string) {
  const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle) {
    throw new NotFoundException('vehicle not found');
  }
  await this.prisma.vehicle.delete({ where: { id } });
  return { message: `Vehicle with id ${id} has been deleted.` };
}

}
