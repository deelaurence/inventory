import { IsNumber, IsPositive, IsMongoId, IsOptional } from 'class-validator';

export class UpdateProductInventoryDto {
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  sellingPrice?: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsMongoId()
  locationId: string;

  @IsMongoId()
  @IsOptional()
  importLocationId?: string;
}

