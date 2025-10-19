import { IsString, IsNumber, IsNotEmpty, IsPositive, IsMongoId, IsOptional } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  partsNumber: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @IsMongoId()
  locationId: string;

  @IsMongoId()
  @IsOptional()
  importLocationId?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  sellingPrice?: number;
}
