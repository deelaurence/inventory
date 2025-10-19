import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ImportLocation, ImportLocationDocument } from './schemas/import-location.schema';

@Injectable()
export class ImportLocationsService {
  constructor(
    @InjectModel(ImportLocation.name)
    private importLocationModel: Model<ImportLocationDocument>,
  ) {}

  async create(createImportLocationDto: {
    name: string;
    country?: string;
    description?: string;
  }): Promise<ImportLocation> {
    const importLocation = new this.importLocationModel(createImportLocationDto);
    return importLocation.save();
  }

  async findAll(): Promise<ImportLocation[]> {
    return this.importLocationModel.find().exec();
  }

  async findById(id: string): Promise<ImportLocation | null> {
    return this.importLocationModel.findById(id).exec();
  }

  async findByName(name: string): Promise<ImportLocation | null> {
    return this.importLocationModel.findOne({ name }).exec();
  }

  async update(id: string, updateImportLocationDto: {
    name?: string;
    country?: string;
    description?: string;
  }): Promise<ImportLocation | null> {
    return this.importLocationModel
      .findByIdAndUpdate(id, updateImportLocationDto, { new: true })
      .exec();
  }

  async remove(id: string): Promise<ImportLocation | null> {
    return this.importLocationModel.findByIdAndDelete(id).exec();
  }
}
