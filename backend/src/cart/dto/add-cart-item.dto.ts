import { IsInt, IsOptional, Min } from 'class-validator';

export class AddCartItemDto {
  @IsInt()
  paintingId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
