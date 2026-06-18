import {
    IsArray,
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';

export class CreatePaintingDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    subtitle?: string;

    @IsString()
    cardImage: string;

    @IsArray()
    images: string[];

    @IsNumber()
    @Min(0)
    price: number;

    @IsOptional()
    @IsNumber()
    @Min(0)
    discount?: number;

    @IsOptional()
    @IsBoolean()
    isFeatured?: boolean;

    @IsOptional()
    @IsString()
    author?: string;

    @IsOptional()
    @IsString()
    technique?: string;

    @IsOptional()
    @IsString()
    material?: string;

    @IsOptional()
    @IsNumber()
    width?: number;

    @IsOptional()
    @IsNumber()
    height?: number;

    @IsOptional()
    @IsNumber()
    year?: number;

    @IsString()
    description: string;
}