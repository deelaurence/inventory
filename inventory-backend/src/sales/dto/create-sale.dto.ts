
import { IsString, IsNumber, IsNotEmpty, IsPositive, IsMongoId, IsOptional, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

class SaleProductDto {
  @IsMongoId()
  productId: string;

  @IsMongoId()
  locationId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  unitPrice: number;
}

export class CreateSaleDto {
  @ValidateNested({ each: true })
  @Type(() => SaleProductDto)
  @ArrayMinSize(1)
  products: SaleProductDto[];

  @IsString()
  @IsOptional()
  notes?: string;
}

