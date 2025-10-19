import { Controller, Get, Param } from '@nestjs/common';
import { MovementsService } from './movements.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UseGuards } from '@nestjs/common';

@Controller('movements')
@UseGuards(JwtAuthGuard)
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  async findAll() {
    return this.movementsService.getMovementHistory();
  }

  @Get('product/:productId')
  async findByProduct(@Param('productId') productId: string) {
    return this.movementsService.getMovementsByProduct(productId);
  }
}
