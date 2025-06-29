/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { VehicleController } from './vehicle.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [VehicleController],
  providers: [VehicleService],
  exports: [VehicleService],
})
export class VehicleModule {}
