import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SaleDocument = Sale & Document;

@Schema({ timestamps: true })
export class Sale {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Location' })
  locationId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  soldBy: Types.ObjectId;

  @Prop({ default: Date.now })
  soldAt: Date;

  @Prop({ default: '' })
  notes: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

