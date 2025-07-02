import {
  Controller,
  Post,
  Get,
  Body,
  ConflictException,
  InternalServerErrorException,
  HttpStatus,
  HttpCode,
  Query,
  Param,
  Patch,
  Delete,
  UseGuards,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, } from '@nestjs/platform-express';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Vehicle } from './interface/vehicle.interface';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('vehicles')
@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehicleController {
  constructor(
    private readonly vehicleService: VehicleService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @Roles('ADMIN', 'AGENT')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vehicle' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The vehicle has been successfully created.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Vehicle with this color already exists.',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Failed to create vehicle due to server error.',
  })
  async createVehicle(
    @Body() createVehicleDto: CreateVehicleDto,
  ): Promise<{ data: Vehicle; message: string }> {
    try {
      const vehicle = await this.vehicleService.create(createVehicleDto);
      
      return {
        data: vehicle,
        message: `Vehicle ${vehicle.name} (ID: ${vehicle.id}) has been created successfully.`,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: error.message,
          error: 'Conflict',
        });
      }
      
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create vehicle. Please try again later.',
        error: 'Internal Server Error',
      });
    }
  }

  @Post('with-image')
  @Roles('ADMIN', 'AGENT')
  @UseInterceptors(FileInterceptor('image'))
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new vehicle with image upload' })
  async createVehicleWithImage(
    @Body() createVehicleDto: CreateVehicleDto,
    @UploadedFile() image: any,
  ): Promise<{ data: Vehicle; message: string }> {
    try {
      let imageUrl = createVehicleDto.images;
      if (image) {
        const uploadResult = await this.cloudinaryService.uploadImage(image);
        imageUrl = uploadResult.secure_url;
      }
      const vehicleData = { ...createVehicleDto, images: imageUrl };
      const vehicle = await this.vehicleService.create(vehicleData);
      return {
        data: vehicle,
        message: `Vehicle ${vehicle.name} (ID: ${vehicle.id}) has been created successfully with image.`,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException({
          statusCode: HttpStatus.CONFLICT,
          message: error.message,
          error: 'Conflict',
        });
      }
      throw new InternalServerErrorException({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Failed to create vehicle. Please try again later.',
        error: 'Internal Server Error',
      });
    }
  }

  @Get()
  @Public()
  findAll(@Query('search') search?: string) {
    return this.vehicleService.findAll(search);
  }
  

  
  @Get(':name')
  @Public()
  findOne(@Param('name') name: string) {
    return this.vehicleService.findOne(name);
  }

  @Get('id/:id')
  @Public()
  findById(@Param('id') id: string) {
    return this.vehicleService.findOne(id);
  }
   

  @Patch(':id')
  @Roles('ADMIN', 'AGENT')
  @ApiOperation({ summary: 'Update a vehicle' })
  @ApiResponse({ status: HttpStatus.OK, description: 'The vehicle has been successfully updated.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vehicle not found.' })
  async updateVehicle(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ) {
    return this.vehicleService.update(id, updateVehicleDto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'AGENT')
  @ApiOperation({ summary: 'Delete a vehicle' })
  @ApiResponse({ status: HttpStatus.OK, description: 'The vehicle has been successfully deleted.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vehicle not found.' })
  async deleteVehicle(@Param('id') id: string) {
    return this.vehicleService.delete(id);
  }
}