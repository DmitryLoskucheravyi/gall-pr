import { Type } from 'class-transformer';
import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @Type(() => Number)
  @IsInt()
  orderId: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  // Long enough to say something, short enough to sit on a card.
  @IsString()
  @MinLength(10)
  @MaxLength(1500)
  text: string;
}
