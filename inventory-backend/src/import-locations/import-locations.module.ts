import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ImportLocationsService } from './import-locations.service';
import { ImportLocationsController } from './import-locations.controller';
import { ImportLocation, ImportLocationSchema } from './schemas/import-location.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ImportLocation.name, schema: ImportLocationSchema },
    ]),
  ],
  controllers: [ImportLocationsController],
  providers: [ImportLocationsService],
  exports: [ImportLocationsService],
})
export class ImportLocationsModule {}
