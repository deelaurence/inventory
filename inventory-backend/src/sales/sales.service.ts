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
    const { products, notes } = createSaleDto;
    if (!products || !Array.isArray(products) || products.length === 0) {
      throw new BadRequestException('At least one product is required for a sale.');
    }

    // Validate all products and update stock
    for (const item of products) {
      const { productId, locationId, quantity } = item;
      const product = await this.productsService.findById(productId);
      if (!product) {
        throw new NotFoundException(`Product not found: ${productId}`);
      }
      const locationObjectId = new Types.ObjectId(locationId);
      const locationIdString = locationId.toString();
      const locationIndex = product.locations.findIndex(loc => {
        let locId: string;
        if (loc.locationId instanceof Types.ObjectId) {
          locId = loc.locationId.toString();
        } else if (loc.locationId && typeof loc.locationId === 'object') {
          locId = (loc.locationId as any)._id?.toString() || '';
        } else {
          locId = String(loc.locationId || '');
        }
        return locId === locationIdString || locId === locationObjectId.toString();
      });
      if (locationIndex === -1) {
        throw new BadRequestException(
          `Product "${product.description}" (#${product.partsNumber}) is not available at the selected location. ` +
          `Please select a location where this product has stock.`
        );
      }
      if (product.locations[locationIndex].quantity < quantity) {
        throw new BadRequestException(`Insufficient stock for product ${product.description}. Available: ${product.locations[locationIndex].quantity}`);
      }
    }

    // Deduct stock and create movement for each product
    for (const item of products) {
      const { productId, locationId, quantity, unitPrice } = item;
      const product = await this.productsService.findById(productId);
      if (!product) continue; // Should not happen due to previous validation
      const locationIndex = product.locations.findIndex(loc => {
        let locId: string;
        if (loc.locationId instanceof Types.ObjectId) {
          locId = loc.locationId.toString();
        } else if (loc.locationId && typeof loc.locationId === 'object') {
          locId = (loc.locationId as any)._id?.toString() || '';
        } else {
          locId = String(loc.locationId || '');
        }
        return locId === locationId.toString();
      });
      if (locationIndex === -1) continue;
      await this.productsService.updateQuantityAtLocation(
        productId,
        locationId,
        product.locations[locationIndex].quantity - quantity
      );
      await this.movementsService.createMovement({
        productId: productId,
        fromLocationId: locationId,
        quantity,
        unitPrice,
        movedBy: userId,
        movementType: MovementType.EXPORT,
        notes: `Sold ${quantity} units at $${unitPrice.toFixed(2)} per unit${notes ? `. Notes: ${notes}` : ''}`,
      });
    }

    // Create the sale document
    const sale = new this.saleModel({
      products: products.map(item => ({
        productId: new Types.ObjectId(item.productId),
        locationId: new Types.ObjectId(item.locationId),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
      soldBy: new Types.ObjectId(userId),
      soldAt: new Date(),
      notes: notes || '',
    });
    const savedSale = await sale.save();
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
      .populate('products.productId', 'description partsNumber')
      .populate('products.locationId', 'name')
      .populate('soldBy', 'name email')
      .sort({ soldAt: -1 });

    // If search is provided, we need to filter after population
    let allSales = await salesQuery.exec();
    
    if (paginationDto?.search) {
      const searchLower = paginationDto.search.toLowerCase();
      allSales = allSales.filter(sale => {
        // Search in all products in the sale
        if (Array.isArray(sale.products)) {
          return sale.products.some((item: any) => {
            if (item.productId && typeof item.productId === 'object') {
              const description = (item.productId.description || '').toLowerCase();
              const partsNumber = (item.productId.partsNumber || '').toLowerCase();
              return description.includes(searchLower) || partsNumber.includes(searchLower);
            }
            return false;
          });
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
      .populate('products.productId', 'description partsNumber')
      .populate('products.locationId', 'name')
      .populate('soldBy', 'name email')
      .exec();
  }

  async getSalesByLocation(locationId: string): Promise<Sale[]> {
    // Find sales where any product in products array has the given locationId
    return this.saleModel.find({
      'products.locationId': new Types.ObjectId(locationId)
    })
      .populate('products.productId', 'description partsNumber')
      .populate('products.locationId', 'name')
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

    // Calculate total sales and quantity (sum over all products in each sale)
    let totalSales = 0;
    let totalQuantity = 0;
    for (const sale of sales) {
      for (const item of sale.products) {
        totalSales += (item.unitPrice * item.quantity);
        totalQuantity += item.quantity;
      }
    }

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

    let salesToday = 0;
    for (const sale of salesTodayList) {
      for (const item of sale.products) {
        salesToday += (item.unitPrice * item.quantity);
      }
    }

    return {
      totalSales: Math.round(totalSales * 100) / 100, // Round to 2 decimal places
      totalQuantity,
      salesToday: Math.round(salesToday * 100) / 100,
    };
  }
}

