import { IsNumber, IsNotEmpty, IsPositive, IsMongoId } from 'class-validator';

export class TransferProductDto {
  @IsMongoId()
  fromLocationId: string;

  @IsMongoId()
  toLocationId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;
}
