import { IsString, IsNumber, IsNotEmpty, IsPositive, IsMongoId, IsOptional } from 'class-validator';

export class CreateSaleDto {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  locationId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

