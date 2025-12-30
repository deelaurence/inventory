import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ProductsService } from '../products/products.service';
import { MovementsService } from '../movements/movements.service';
import { MovementType } from '../movements/schemas/movement.schema';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class SalesService {
  constructor(
    @InjectModel(Sale.name) private saleModel: Model<SaleDocument>,
    @Inject(forwardRef(() => ProductsService)) private productsService: ProductsService,
    @Inject(forwardRef(() => MovementsService)) private movementsService: MovementsService,
  ) {}

  async create(createSaleDto: CreateSaleDto, userId: string): Promise<Sale> {
    const { productId, locationId, quantity, price, notes } = createSaleDto;

    // Get the product to check availability (without populating locations to get raw ObjectIds)
    const product = await this.productsService.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Normalize locationId for comparison
    const locationObjectId = new Types.ObjectId(locationId);
    const locationIdString = locationId.toString();

    // Check if product has stock at the specified location
    // Note: locationId might be populated (object with _id) or ObjectId
    const locationIndex = product.locations.findIndex(
      loc => {
        let locId: string;
        
        if (loc.locationId instanceof Types.ObjectId) {
          locId = loc.locationId.toString();
        } else if (loc.locationId && typeof loc.locationId === 'object') {
          // Populated locationId object (has _id property)
          locId = (loc.locationId as any)._id?.toString() || '';
        } else {
          locId = String(loc.locationId || '');
        }
        
        return locId === locationIdString || locId === locationObjectId.toString();
      }
    );

    if (locationIndex === -1) {
      throw new BadRequestException(
        `Product "${product.description}" (#${product.partsNumber}) is not available at the selected location. ` +
        `Please select a location where this product has stock.`
      );
    }

    if (product.locations[locationIndex].quantity < quantity) {
      throw new BadRequestException(`Insufficient stock. Available: ${product.locations[locationIndex].quantity}`);
    }

    // Create the sale
    const sale = new this.saleModel({
      productId: new Types.ObjectId(productId),
      locationId: new Types.ObjectId(locationId),
      quantity,
      price,
      soldBy: new Types.ObjectId(userId),
      soldAt: new Date(),
      notes: notes || '',
    });

    const savedSale = await sale.save();

    // Update product quantity (subtract sold quantity)
    await this.productsService.updateQuantityAtLocation(
      productId,
      locationId,
      product.locations[locationIndex].quantity - quantity
    );

    // Create movement record for audit trail
    await this.movementsService.createMovement({
      productId: productId,
      fromLocationId: locationId,
      quantity,
      unitPrice: product.unitPrice,
      movedBy: userId,
      movementType: MovementType.EXPORT,
      notes: `Sold ${quantity} units at $${price.toFixed(2)} per unit${notes ? `. Notes: ${notes}` : ''}`,
    });

    return savedSale;
  }

  async findAll(paginationDto?: PaginationDto): Promise<PaginatedResponse<Sale>> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 50;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Date filtering
    if (paginationDto?.startDate || paginationDto?.endDate) {
      query.soldAt = {};
      if (paginationDto.startDate) {
        query.soldAt.$gte = new Date(paginationDto.startDate);
      }
      if (paginationDto.endDate) {
        const endDate = new Date(paginationDto.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        query.soldAt.$lte = endDate;
      }
    }

    // Get all sales first (for search filtering)
    let salesQuery = this.saleModel
      .find(query)
      .populate('productId', 'description partsNumber')
      .populate('locationId', 'name')
      .populate('soldBy', 'name email')
      .sort({ soldAt: -1 });

    // If search is provided, we need to filter after population
    let allSales = await salesQuery.exec();
    
    if (paginationDto?.search) {
      const searchLower = paginationDto.search.toLowerCase();
      allSales = allSales.filter(sale => {
        const product = sale.productId as any;
        if (product) {
          const description = (product.description || '').toLowerCase();
          const partsNumber = (product.partsNumber || '').toLowerCase();
          return description.includes(searchLower) || partsNumber.includes(searchLower);
        }
        return false;
      });
    }

    // Get total count
    const total = allSales.length;

    // Apply pagination
    const data = allSales.slice(skip, skip + limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Sale | null> {
    return this.saleModel.findById(id)
      .populate('productId', 'description partsNumber')
      .populate('locationId', 'name')
      .populate('soldBy', 'name email')
      .exec();
  }

  async getSalesByLocation(locationId: string): Promise<Sale[]> {
    return this.saleModel.find({
      locationId: new Types.ObjectId(locationId)
    })
      .populate('productId', 'description partsNumber')
      .populate('locationId', 'name')
      .populate('soldBy', 'name email')
      .sort({ soldAt: -1 })
      .exec();
  }

  async getTotalSales(startDate?: Date, endDate?: Date): Promise<{ totalSales: number; totalQuantity: number; salesToday: number }> {
    const query: any = {};

    // If dates are provided, filter by date range
    if (startDate || endDate) {
      query.soldAt = {};
      if (startDate) {
        query.soldAt.$gte = startDate;
      }
      if (endDate) {
        const adjustedEndDate = new Date(endDate);
        adjustedEndDate.setHours(23, 59, 59, 999); // End of day
        query.soldAt.$lte = adjustedEndDate;
      }
    }

    // Get all sales in the date range
    const sales = await this.saleModel.find(query).exec();

    // Calculate total sales (price * quantity)
    const totalSales = sales.reduce((sum, sale) => {
      return sum + (sale.price * sale.quantity);
    }, 0);

    // Calculate total quantity sold
    const totalQuantity = sales.reduce((sum, sale) => {
      return sum + sale.quantity;
    }, 0);

    // Calculate sales for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const salesTodayList = await this.saleModel.find({
      soldAt: {
        $gte: today,
        $lt: tomorrowStart,
      },
    }).exec();

    const salesToday = salesTodayList.reduce((sum, sale) => {
      return sum + (sale.price * sale.quantity);
    }, 0);

    return {
      totalSales: Math.round(totalSales * 100) / 100, // Round to 2 decimal places
      totalQuantity,
      salesToday: Math.round(salesToday * 100) / 100,
    };
  }
}

