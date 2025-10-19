import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ImportLocationsService } from './import-locations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('import-locations')
@UseGuards(JwtAuthGuard)
export class ImportLocationsController {
  constructor(private readonly importLocationsService: ImportLocationsService) {}

  @Post()
  create(@Body() createImportLocationDto: {
    name: string;
    country?: string;
    description?: string;
  }) {
    return this.importLocationsService.create(createImportLocationDto);
  }

  @Get()
  findAll() {
    return this.importLocationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.importLocationsService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateImportLocationDto: {
    name?: string;
    country?: string;
    description?: string;
  }) {
    return this.importLocationsService.update(id, updateImportLocationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.importLocationsService.remove(id);
  }
}
