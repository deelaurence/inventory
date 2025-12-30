import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { TransferProductDto } from './dto/transfer-product.dto';
import { ExportProductDto } from './dto/export-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductInventoryDto } from './dto/update-product-inventory.dto';
import { MovementsService } from '../movements/movements.service';
import { MovementType } from '../movements/schemas/movement.schema';
import { PaginationDto, PaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @Inject(forwardRef(() => MovementsService)) private movementsService: MovementsService,
  ) {}

  async create(createProductDto: CreateProductDto, userId: string): Promise<Product> {
    const { description, partsNumber, quantity, unitPrice, locationId, importLocationId, sellingPrice } = createProductDto;
    
    // Check if product already exists
    const existingProduct = await this.productModel.findOne({ partsNumber }).exec();
    
    if (existingProduct) {
      // Update product-level unitPrice if provided
      if (unitPrice) {
        existingProduct.unitPrice = unitPrice;
      }
      
      // Add quantity to existing location or create new location entry
      const locationIndex = existingProduct.locations.findIndex(
        loc => loc.locationId.toString() === locationId
      );
      
      if (locationIndex >= 0) {
        existingProduct.locations[locationIndex].quantity += quantity;
      } else {
        existingProduct.locations.push({
          locationId: new Types.ObjectId(locationId),
          quantity,
        });
      }
      
      const savedProduct = await existingProduct.save();
      
      await this.movementsService.createMovement({
        productId: (savedProduct._id as any).toString(),
        toLocationId: locationId,
        quantity,
        unitPrice: savedProduct.unitPrice,
        movedBy: userId,
        movementType: MovementType.IMPORT,
        notes: 'Product imported',
      });
      
      // Return populated product
      return this.productModel.findById(savedProduct._id)
        .populate('locations.locationId', 'name')
        .populate('importLocationId', 'name country')
        .populate('priceComparisons.importLocationId', 'name country')
        .exec() as Promise<Product>;
    } else {
      // Create new product
      const product = new this.productModel({
        description,
        partsNumber,
        locations: [{
          locationId: new Types.ObjectId(locationId),
          quantity,
        }],
        importLocationId: importLocationId ? new Types.ObjectId(importLocationId) : undefined,
        unitPrice,
        sellingPrice,
      });
      
      const savedProduct = await product.save();
      
      await this.movementsService.createMovement({
        productId: (savedProduct._id as any).toString(),
        toLocationId: locationId,
        quantity,
        unitPrice: savedProduct.unitPrice,
        movedBy: userId,
        movementType: MovementType.IMPORT,
        notes: 'Product imported',
      });
      
      // Return populated product
      return this.productModel.findById(savedProduct._id)
        .populate('locations.locationId', 'name')
        .populate('importLocationId', 'name country')
        .populate('priceComparisons.importLocationId', 'name country')
        .exec() as Promise<Product>;
    }
  }

  async findAll(paginationDto?: PaginationDto): Promise<PaginatedResponse<Product>> {
    const page = paginationDto?.page || 1;
    const limit = paginationDto?.limit || 50;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Date filtering (on createdAt)
    if (paginationDto?.startDate || paginationDto?.endDate) {
      query.createdAt = {};
      if (paginationDto.startDate) {
        query.createdAt.$gte = new Date(paginationDto.startDate);
      }
      if (paginationDto.endDate) {
        const endDate = new Date(paginationDto.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        query.createdAt.$lte = endDate;
      }
    }

    // Search by product name/description or parts number
    if (paginationDto?.search) {
      query.$or = [
        { description: { $regex: paginationDto.search, $options: 'i' } },
        { partsNumber: { $regex: paginationDto.search, $options: 'i' } },
      ];
    }

    // Get total count
    const total = await this.productModel.countDocuments(query).exec();

    // Get paginated data
    const data = await this.productModel
      .find(query)
      .populate('locations.locationId', 'name')
      .populate('importLocationId', 'name country')
      .populate('priceComparisons.importLocationId', 'name country')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Product | null> {
    return this.productModel.findById(id)
      .populate('locations.locationId', 'name')
      .populate('importLocationId', 'name country')
      .populate('priceComparisons.importLocationId', 'name country')
      .exec();
  }

  async getProductsByLocation(locationId: string): Promise<Product[]> {
    return this.productModel.find({
      'locations.locationId': new Types.ObjectId(locationId)
    })
      .populate('locations.locationId', 'name')
      .populate('importLocationId', 'name country')
      .populate('priceComparisons.importLocationId', 'name country')
      .exec();
  }

  async updateQuantityAtLocation(productId: string, locationId: string, quantity: number): Promise<Product | null> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const locationIndex = product.locations.findIndex(
      loc => loc.locationId.toString() === locationId
    );

    if (locationIndex >= 0) {
      product.locations[locationIndex].quantity = quantity;
    } else {
      throw new BadRequestException('Product not found at specified location');
    }

    await product.save();
    
    // Return populated product
    return this.productModel.findById(productId)
      .populate('locations.locationId', 'name')
      .populate('importLocationId', 'name country')
      .populate('priceComparisons.importLocationId', 'name country')
      .exec();
  }

  async transferProduct(productId: string, transferDto: TransferProductDto, userId: string): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { fromLocationId, toLocationId, quantity } = transferDto;

    // Find source location
    const fromLocationIndex = product.locations.findIndex(
      loc => loc.locationId.toString() === fromLocationId
    );

    if (fromLocationIndex === -1) {
      throw new BadRequestException('Product not found at source location');
    }

    if (product.locations[fromLocationIndex].quantity < quantity) {
      throw new BadRequestException('Insufficient quantity at source location');
    }

    // Reduce quantity at source location
    product.locations[fromLocationIndex].quantity -= quantity;

    // Add quantity to destination location
    const toLocationIndex = product.locations.findIndex(
      loc => loc.locationId.toString() === toLocationId
    );

    if (toLocationIndex >= 0) {
      product.locations[toLocationIndex].quantity += quantity;
    } else {
      product.locations.push({
        locationId: new Types.ObjectId(toLocationId),
        quantity,
      });
    }

    const savedProduct = await product.save();

    // Log movement
    await this.movementsService.createMovement({
      productId: productId,
      fromLocationId: fromLocationId,
      toLocationId: toLocationId,
      quantity,
      unitPrice: savedProduct.unitPrice,
      movedBy: userId,
      movementType: MovementType.TRANSFER,
      notes: 'Product transferred between locations',
    });

    // Return populated product
    return this.productModel.findById(productId)
      .populate('locations.locationId', 'name')
      .populate('importLocationId', 'name country')
      .populate('priceComparisons.importLocationId', 'name country')
      .exec() as Promise<Product>;
  }

  async exportProduct(productId: string, exportDto: ExportProductDto, userId: string): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { locationId, quantity } = exportDto;

    const locationIndex = product.locations.findIndex(
      loc => loc.locationId.toString() === locationId
    );

    if (locationIndex === -1) {
      throw new BadRequestException('Product not found at specified location');
    }

    if (product.locations[locationIndex].quantity < quantity) {
      throw new BadRequestException('Insufficient quantity at location');
    }

    product.locations[locationIndex].quantity -= quantity;

    const savedProduct = await product.save();

    // Log movement
    await this.movementsService.createMovement({
      productId: productId,
      fromLocationId: locationId,
      quantity,
      unitPrice: product.unitPrice,
      movedBy: userId,
      movementType: MovementType.EXPORT,
      notes: 'Product exported/removed from inventory',
    });

    // Return populated product
    return this.productModel.findById(productId)
      .populate('locations.locationId', 'name')
      .populate('importLocationId', 'name country')
      .populate('priceComparisons.importLocationId', 'name country')
      .exec() as Promise<Product>;
  }

  async updateProduct(productId: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Build update object with $set and $unset operators
    const updateData: any = {};
    const unsetData: any = {};
    
    if (updateProductDto.description !== undefined) {
      updateData.description = updateProductDto.description;
    }

    if (updateProductDto.unitPrice !== undefined) {
      updateData.unitPrice = updateProductDto.unitPrice;
    }

    if (updateProductDto.priceComparisons !== undefined) {
      updateData.priceComparisons = updateProductDto.priceComparisons.map(pc => ({
        importLocationId: new Types.ObjectId(pc.importLocationId),
        price: pc.price
      }));
    }

    if (updateProductDto.sellingPrice !== undefined) {
      if (updateProductDto.sellingPrice === null) {
        // Use $unset to remove the field
        unsetData.sellingPrice = '';
      } else {
        updateData.sellingPrice = updateProductDto.sellingPrice;
      }
    }

    // Build the final update object
    const finalUpdate: any = {};
    if (Object.keys(updateData).length > 0) {
      finalUpdate.$set = updateData;
    }
    if (Object.keys(unsetData).length > 0) {
      finalUpdate.$unset = unsetData;
    }

    // Perform the update if there's anything to update
    if (Object.keys(finalUpdate).length > 0) {
      await this.productModel.findByIdAndUpdate(productId, finalUpdate).exec();
    }

    // Return the updated product with populated fields
    const updatedProduct = await this.productModel.findById(productId)
      .populate('locations.locationId', 'name')
      .populate('importLocationId', 'name country')
      .populate('priceComparisons.importLocationId', 'name country')
      .exec();
    
    if (!updatedProduct) {
      throw new NotFoundException('Product not found after update');
    }

    return updatedProduct;
  }

  async updateProductAndInventory(
    productId: string,
    updateDto: UpdateProductInventoryDto,
    userId: string
  ): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Update product prices
    product.unitPrice = updateDto.unitPrice;
    if (updateDto.sellingPrice !== undefined) {
      product.sellingPrice = updateDto.sellingPrice;
    }

    // Add quantity to existing location or create new location entry
    const locationIndex = product.locations.findIndex(
      loc => loc.locationId.toString() === updateDto.locationId
    );

    if (locationIndex >= 0) {
      product.locations[locationIndex].quantity += updateDto.quantity;
    } else {
      product.locations.push({
        locationId: new Types.ObjectId(updateDto.locationId),
        quantity: updateDto.quantity,
      });
    }

    // Update import location if provided
    if (updateDto.importLocationId) {
      product.importLocationId = new Types.ObjectId(updateDto.importLocationId);
    }

    const savedProduct = await product.save();

    // Log movement
    await this.movementsService.createMovement({
      productId: productId,
      toLocationId: updateDto.locationId,
      quantity: updateDto.quantity,
      unitPrice: savedProduct.unitPrice,
      movedBy: userId,
      movementType: MovementType.IMPORT,
      notes: 'Product updated and inventory added',
    });

    // Return the updated product with populated fields
    const updatedProduct = await this.productModel.findById(productId)
      .populate('locations.locationId', 'name')
      .populate('importLocationId', 'name country')
      .populate('priceComparisons.importLocationId', 'name country')
      .exec();
    
    if (!updatedProduct) {
      throw new NotFoundException('Product not found after update');
    }

    return updatedProduct;
  }

  async getProductsByLocationStats(): Promise<Array<{ locationId: string; locationName: string; totalQuantity: number }>> {
    const products = await this.productModel
      .find()
      .populate('locations.locationId', 'name')
      .exec();

    const locationMap = new Map<string, { locationName: string; totalQuantity: number }>();

    for (const product of products) {
      for (const location of product.locations) {
        const locationId = (location.locationId as any)._id?.toString();
        const locationName = (location.locationId as any).name || '';
        
        if (!locationMap.has(locationId)) {
          locationMap.set(locationId, {
            locationName,
            totalQuantity: 0,
          });
        }
        
        const current = locationMap.get(locationId)!;
        current.totalQuantity += location.quantity;
      }
    }

    // Convert map to array and sort by quantity descending
    return Array.from(locationMap.entries())
      .map(([locationId, data]) => ({
        locationId,
        ...data,
      }))
      .sort((a, b) => b.totalQuantity - a.totalQuantity);
  }
}
