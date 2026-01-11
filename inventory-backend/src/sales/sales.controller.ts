import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async create(@Body() createSaleDto: CreateSaleDto, @Request() req) {
    // createSaleDto.products is now an array
    return this.salesService.create(createSaleDto, req.user.sub);
  }

  @Get()
  async findAll(@Query() paginationDto: PaginationDto, @Request() req) {
    return this.salesService.findAll(paginationDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.salesService.findById(id);
  }

  @Get('location/:locationId')
  async findByLocation(@Param('locationId') locationId: string) {
    return this.salesService.getSalesByLocation(locationId);
  }

  @Get('stats/total')
  async getTotalSales(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.salesService.getTotalSales(start, end);
  }
}

