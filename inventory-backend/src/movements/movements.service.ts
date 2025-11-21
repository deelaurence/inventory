import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Movement, MovementDocument, MovementType } from './schemas/movement.schema';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

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

  async getMovementHistory(paginationDto?: PaginationDto): Promise<PaginatedResponse<Movement>> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 50;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Date filtering
    if (paginationDto?.startDate || paginationDto?.endDate) {
      query.timestamp = {};
      if (paginationDto.startDate) {
        query.timestamp.$gte = new Date(paginationDto.startDate);
      }
      if (paginationDto.endDate) {
        const endDate = new Date(paginationDto.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        query.timestamp.$lte = endDate;
      }
    }

    // Get all movements first (for search filtering)
    let movementsQuery = this.movementModel
      .find(query)
      .populate('productId', 'description partsNumber')
      .populate('fromLocationId', 'name')
      .populate('toLocationId', 'name')
      .populate('movedBy', 'name email')
      .sort({ timestamp: -1 });

    // If search is provided, we need to filter after population
    let allMovements = await movementsQuery.exec();
    
    if (paginationDto?.search) {
      const searchLower = paginationDto.search.toLowerCase();
      allMovements = allMovements.filter(movement => {
        const product = movement.productId as any;
        if (product) {
          const description = (product.description || '').toLowerCase();
          const partsNumber = (product.partsNumber || '').toLowerCase();
          return description.includes(searchLower) || partsNumber.includes(searchLower);
        }
        return false;
      });
    }

    // Get total count
    const total = allMovements.length;

    // Apply pagination
    const data = allMovements.slice(skip, skip + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getMovementsByProduct(productId: string): Promise<Movement[]> {
    return this.movementModel
      .find({ productId: new Types.ObjectId(productId) })
      .populate('fromLocationId', 'name')
      .populate('toLocationId', 'name')
      .populate('movedBy', 'name email')
      .sort({ timestamp: -1 })
      .exec();
  }
}
