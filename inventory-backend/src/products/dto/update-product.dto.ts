import { IsString, IsNumber, IsNotEmpty, IsPositive, IsOptional, ValidateIf, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class PriceComparisonDto {
  @IsMongoId()
  importLocationId: string;

  @IsNumber()
  @IsPositive()
  price: number;
}

export class UpdateProductDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  unitPrice?: number;

  @ValidateIf((o) => o.sellingPrice !== null)
  @IsNumber()
  @IsPositive()
  @IsOptional()
  sellingPrice?: number | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceComparisonDto)
  @IsOptional()
  priceComparisons?: PriceComparisonDto[];
}

