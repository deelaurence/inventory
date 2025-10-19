import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ _id: false })
export class ProductLocation {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Location' })
  locationId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;
}

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true, unique: true })
  partsNumber: string;

  @Prop({ type: [ProductLocation], default: [] })
  locations: ProductLocation[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
