import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { TransferProductDto } from './dto/transfer-product.dto';
import { ExportProductDto } from './dto/export-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  async create(@Body() createProductDto: CreateProductDto, @Request() req) {
    const product = await this.productsService.create(createProductDto, req.user.sub);
    return product;
  }

  @Get()
  async findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id/transfer')
  async transfer(@Param('id') id: string, @Body() transferDto: TransferProductDto, @Request() req) {
    return this.productsService.transferProduct(id, transferDto, req.user.sub);
  }

  @Delete(':id/export')
  async export(@Param('id') id: string, @Body() exportDto: ExportProductDto, @Request() req) {
    return this.productsService.exportProduct(id, exportDto, req.user.sub);
  }
}
