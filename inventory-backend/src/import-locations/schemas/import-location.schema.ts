import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ImportLocationDocument = ImportLocation & Document;

@Schema({ timestamps: true })
export class ImportLocation {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop()
  country: string;

  @Prop()
  description: string;
}

export const ImportLocationSchema = SchemaFactory.createForClass(ImportLocation);
