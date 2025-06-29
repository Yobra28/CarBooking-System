import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';

@ApiTags('reviews')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new review' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The review has been successfully created.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User has already reviewed this vehicle.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User can only review vehicles they have rented.',
  })
  async create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewService.create(req.user.id, createReviewDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all reviews' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns all reviews.',
  })
  findAll() {
    return this.reviewService.findAll();
  }

  @Get('user/:userId')
  @Public()
  @ApiOperation({ summary: 'Get reviews by user ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns reviews for the specified user.',
  })
  findByUser(@Param('userId') userId: string) {
    return this.reviewService.findByUser(userId);
  }

  @Get('vehicle/:vehicleId')
  @Public()
  @ApiOperation({ summary: 'Get reviews for a specific vehicle' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns reviews for the specified vehicle.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Vehicle not found.',
  })
  findByVehicle(@Param('vehicleId') vehicleId: string) {
    return this.reviewService.findByVehicle(vehicleId);
  }

  @Get('vehicle/:vehicleId/stats')
  @Public()
  @ApiOperation({ summary: 'Get rating statistics for a vehicle' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns rating statistics for the specified vehicle.',
  })
  getVehicleRatingStats(@Param('vehicleId') vehicleId: string) {
    return this.reviewService.getVehicleRatingStats(vehicleId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a specific review' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Returns the specified review.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found.',
  })
  findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a review' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The review has been successfully updated.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User can only update their own reviews.',
  })
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewService.update(req.user.id, id, updateReviewDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a review' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The review has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Review not found.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User can only delete their own reviews.',
  })
  remove(@Request() req, @Param('id') id: string) {
    return this.reviewService.remove(req.user.id, id);
  }
} 