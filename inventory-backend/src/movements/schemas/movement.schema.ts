import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MovementDocument = Movement & Document;

export enum MovementType {
  IMPORT = 'IMPORT',
  TRANSFER = 'TRANSFER',
  EXPORT = 'EXPORT',
}

@Schema({ timestamps: true })
export class Movement {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Product' })
  productId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Location', default: null })
  fromLocationId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Location', default: null })
  toLocationId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  movedBy: Types.ObjectId;

  @Prop({ required: true, enum: MovementType })
  movementType: MovementType;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: '' })
  notes: string;
}

export const MovementSchema = SchemaFactory.createForClass(Movement);
