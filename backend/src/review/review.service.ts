/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { Review } from './interface/review.interface';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createReviewDto: CreateReviewDto): Promise<Review> {
    try {
      // Check if vehicle exists
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: createReviewDto.vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      // Check if user has already reviewed this vehicle
      const existingReview = await this.prisma.review.findFirst({
        where: {
          userId,
          vehicleId: createReviewDto.vehicleId,
        },
      });

      if (existingReview) {
        throw new ConflictException('You have already reviewed this vehicle');
      }

      // Check if user has booked this vehicle (optional business rule)
      const hasBooked = await this.prisma.bookingItem.findFirst({
        where: {
          vehicleId: createReviewDto.vehicleId,
          booking: {
            userId,
            status: 'COMPLETED',
          },
        },
      });

      if (!hasBooked) {
        throw new ForbiddenException('You can only review vehicles you have rented');
      }

      const review = await this.prisma.review.create({
        data: {
          rating: createReviewDto.rating,
          comment: createReviewDto.comment,
          userId,
          vehicleId: createReviewDto.vehicleId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              name: true,
              make: true,
              model: true,
            },
          },
        },
      });

      return review;
    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ConflictException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to create review: ${error.message}`,
      );
    }
  }

  async findAll(vehicleId?: string): Promise<Review[]> {
    try {
      const where = vehicleId ? { vehicleId } : {};
      
      return this.prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              name: true,
              make: true,
              model: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch reviews: ${error.message}`,
      );
    }
  }

  async findByUser(userId: string): Promise<Review[]> {
    try {
      return this.prisma.review.findMany({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              name: true,
              make: true,
              model: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch user reviews: ${error.message}`,
      );
    }
  }

  async findOne(id: string): Promise<Review> {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              name: true,
              make: true,
              model: true,
            },
          },
        },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      return review;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch review: ${error.message}`,
      );
    }
  }

  async findByVehicle(vehicleId: string): Promise<Review[]> {
    try {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: vehicleId },
      });

      if (!vehicle) {
        throw new NotFoundException('Vehicle not found');
      }

      return this.prisma.review.findMany({
        where: { vehicleId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to fetch vehicle reviews: ${error.message}`,
      );
    }
  }

  async update(userId: string, id: string, updateReviewDto: UpdateReviewDto): Promise<Review> {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Only the review author can update their review
      if (review.userId !== userId) {
        throw new ForbiddenException('You can only update your own reviews');
      }

      return this.prisma.review.update({
        where: { id },
        data: updateReviewDto,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              name: true,
              make: true,
              model: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to update review: ${error.message}`,
      );
    }
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    try {
      const review = await this.prisma.review.findUnique({
        where: { id },
      });

      if (!review) {
        throw new NotFoundException('Review not found');
      }

      // Only the review author or admin can delete reviews
      if (review.userId !== userId) {
        // Check if user is admin
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
        });

        if (!user || user.role !== 'ADMIN') {
          throw new ForbiddenException('You can only delete your own reviews');
        }
      }

      await this.prisma.review.delete({
        where: { id },
      });

      return { message: 'Review deleted successfully' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new InternalServerErrorException(
        `Failed to delete review: ${error.message}`,
      );
    }
  }

  async getVehicleRatingStats(vehicleId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    ratingDistribution: { [key: number]: number };
  }> {
    try {
      const reviews = await this.prisma.review.findMany({
        where: { vehicleId },
        select: { rating: true },
      });

      if (reviews.length === 0) {
        return {
          averageRating: 0,
          totalReviews: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = totalRating / reviews.length;

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach((review) => {
        ratingDistribution[review.rating]++;
      });

      return {
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
        totalReviews: reviews.length,
        ratingDistribution,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to get vehicle rating stats: ${error.message}`,
      );
    }
  }
} 