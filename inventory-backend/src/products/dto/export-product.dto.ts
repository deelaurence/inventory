import { IsString, IsNumber, IsNotEmpty, IsPositive, IsMongoId } from 'class-validator';

export class ExportProductDto {
  @IsMongoId()
  locationId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}
