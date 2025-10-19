import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from './schemas/location.schema';

@Injectable()
export class LocationsService {
  constructor(@InjectModel(Location.name) private locationModel: Model<LocationDocument>) {}

  async findAll(): Promise<Location[]> {
    return this.locationModel.find().exec();
  }

  async findById(id: string): Promise<Location | null> {
    return this.locationModel.findById(id).exec();
  }

  async findByName(name: string): Promise<Location | null> {
    return this.locationModel.findOne({ name }).exec();
  }

  async create(name: string): Promise<Location> {
    const location = new this.locationModel({ name });
    return location.save();
  }
}
