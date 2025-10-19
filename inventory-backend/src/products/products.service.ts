import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { TransferProductDto } from './dto/transfer-product.dto';
import { ExportProductDto } from './dto/export-product.dto';
import { MovementsService } from '../movements/movements.service';
import { MovementType } from '../movements/schemas/movement.schema';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @Inject(forwardRef(() => MovementsService)) private movementsService: MovementsService,
  ) {}

  async create(createProductDto: CreateProductDto, userId: string): Promise<Product> {
    const { description, partsNumber, quantity, unitPrice, locationId } = createProductDto;
    
    // Check if product already exists
    const existingProduct = await this.productModel.findOne({ partsNumber }).exec();
    
    if (existingProduct) {
      // Add quantity to existing location or create new location entry
      const locationIndex = existingProduct.locations.findIndex(
        loc => loc.locationId.toString() === locationId
      );
      
      if (locationIndex >= 0) {
        existingProduct.locations[locationIndex].quantity += quantity;
        existingProduct.locations[locationIndex].unitPrice = unitPrice;
      } else {
        existingProduct.locations.push({
          locationId: new Types.ObjectId(locationId),
          quantity,
          unitPrice,
        });
      }
      
      await this.movementsService.createMovement({
        productId: existingProduct._id.toString(),
        toLocationId: locationId,
        quantity,
        unitPrice,
        movedBy: userId,
        movementType: MovementType.IMPORT,
        notes: 'Product imported',
      });
      
      return existingProduct.save();
    } else {
      // Create new product
      const product = new this.productModel({
        description,
        partsNumber,
        locations: [{
          locationId: new Types.ObjectId(locationId),
          quantity,
          unitPrice,
        }],
      });
      
      const savedProduct = await product.save();
      
      await this.movementsService.createMovement({
        productId: savedProduct._id.toString(),
        toLocationId: locationId,
        quantity,
        unitPrice,
        movedBy: userId,
        movementType: MovementType.IMPORT,
        notes: 'Product imported',
      });
      
      return savedProduct;
    }
  }

  async findAll(): Promise<Product[]> {
    return this.productModel.find().populate('locations.locationId', 'name').exec();
  }

  async findById(id: string): Promise<Product | null> {
    return this.productModel.findById(id).populate('locations.locationId', 'name').exec();
  }

  async getProductsByLocation(locationId: string): Promise<Product[]> {
    return this.productModel.find({
      'locations.locationId': new Types.ObjectId(locationId)
    }).populate('locations.locationId', 'name').exec();
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

    return product.save();
  }

  async transferProduct(productId: string, transferDto: TransferProductDto, userId: string): Promise<Product> {
    const product = await this.productModel.findById(productId).exec();
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const { fromLocationId, toLocationId, quantity, unitPrice } = transferDto;

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
      product.locations[toLocationIndex].unitPrice = unitPrice;
    } else {
      product.locations.push({
        locationId: new Types.ObjectId(toLocationId),
        quantity,
        unitPrice,
      });
    }

    const savedProduct = await product.save();

    // Log movement
    await this.movementsService.createMovement({
      productId: productId,
      fromLocationId: fromLocationId,
      toLocationId: toLocationId,
      quantity,
      unitPrice,
      movedBy: userId,
      movementType: MovementType.TRANSFER,
      notes: 'Product transferred between locations',
    });

    return savedProduct;
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
      unitPrice: product.locations[locationIndex].unitPrice,
      movedBy: userId,
      movementType: MovementType.EXPORT,
      notes: 'Product exported/removed from inventory',
    });

    return savedProduct;
  }
}
