import { IsString, IsNumber, IsNotEmpty, IsPositive, IsMongoId } from 'class-validator';

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
}
