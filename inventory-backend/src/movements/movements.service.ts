import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Movement, MovementDocument, MovementType } from './schemas/movement.schema';

@Injectable()
export class MovementsService {
  constructor(@InjectModel(Movement.name) private movementModel: Model<MovementDocument>) {}

  async createMovement(movementData: {
    productId: string;
    fromLocationId?: string;
    toLocationId?: string;
    quantity: number;
    unitPrice: number;
    movedBy: string;
    movementType: MovementType;
    notes?: string;
  }): Promise<Movement> {
    const movement = new this.movementModel({
      ...movementData,
      productId: new Types.ObjectId(movementData.productId),
      fromLocationId: movementData.fromLocationId ? new Types.ObjectId(movementData.fromLocationId) : null,
      toLocationId: movementData.toLocationId ? new Types.ObjectId(movementData.toLocationId) : null,
      movedBy: new Types.ObjectId(movementData.movedBy),
    });

    return movement.save();
  }

  async getMovementHistory(): Promise<Movement[]> {
    return this.movementModel
      .find()
      .populate('productId', 'description partsNumber')
      .populate('fromLocationId', 'name')
      .populate('toLocationId', 'name')
      .populate('movedBy', 'email')
      .sort({ timestamp: -1 })
      .exec();
  }

  async getMovementsByProduct(productId: string): Promise<Movement[]> {
    return this.movementModel
      .find({ productId: new Types.ObjectId(productId) })
      .populate('fromLocationId', 'name')
      .populate('toLocationId', 'name')
      .populate('movedBy', 'email')
      .sort({ timestamp: -1 })
      .exec();
  }
}
