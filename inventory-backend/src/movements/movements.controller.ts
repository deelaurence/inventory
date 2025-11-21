import { Controller, Get, Param, Query } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('movements')
@UseGuards(JwtAuthGuard)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.movementsService.getMovementHistory(paginationDto);
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    return this.movementsService.getMovementsByProduct(productId);
  }
}
