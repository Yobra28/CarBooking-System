import { IsString, IsInt, IsOptional, Min, Max, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({
    description: 'Rating from 1 to 5',
    minimum: 1,
    maximum: 5,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Review comment',
    required: false,
    example: 'Great car, very comfortable and fuel efficient!',
  })
  @IsOptional()
  @IsString()
  comment?: string;

  @ApiProperty({
    description: 'Vehicle ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  vehicleId: string;
} 