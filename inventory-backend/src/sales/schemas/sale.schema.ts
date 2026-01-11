
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type SaleDocument = Sale & Document;

@Schema({ _id: false })
export class SaleProduct {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Location' })
  locationId: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;
}

export const SaleProductSchema = SchemaFactory.createForClass(SaleProduct);

@Schema({ timestamps: true })
export class Sale {
  @Prop({ type: [SaleProductSchema], required: true })
  products: SaleProduct[];

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  soldBy: Types.ObjectId;

  @Prop({ default: Date.now })
  soldAt: Date;

  @Prop({ default: '' })
  notes: string;
}

export const SaleSchema = SchemaFactory.createForClass(Sale);

// Auto-populate product and location refs for reads
SaleSchema.pre(/^find/, function (next) {
  // `this` is the query; cast to any to avoid TypeScript overload conflicts
  const q: any = this;
  q.populate('products.productId', 'description partsNumber')
   .populate('products.locationId', 'name')
   .populate('soldBy', 'name email');
  next();
});

