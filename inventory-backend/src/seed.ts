import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { LocationsService } from './locations/locations.service';
import { ImportLocationsService } from './import-locations/import-locations.service';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const locationsService = app.get(LocationsService);
  const importLocationsService = app.get(ImportLocationsService);

  try {
    // Create locations first
    const locations = ['Warehouse', 'Main Shop'];
    console.log('Starting to seed locations...');
    for (const locationName of locations) {
      console.log(`Checking location: ${locationName}`);
      const existingLocation = await locationsService.findByName(locationName);
      console.log(`Existing location found:`, existingLocation ? 'Yes' : 'No');
      if (!existingLocation) {
        console.log(`Creating location: ${locationName}`);
        await locationsService.create(locationName);
        console.log(`Created location: ${locationName}`);
      } else {
        console.log(`Location already exists: ${locationName}`);
      }
    }

    // Create import locations
    const importLocations = [
      { name: 'Dubai', country: 'UAE', description: 'Dubai, United Arab Emirates' },
      { name: 'Nigeria', country: 'Nigeria', description: 'Lagos, Nigeria' },
      { name: 'France', country: 'France', description: 'Paris, France' },
      { name: 'China', country: 'China', description: 'Guangzhou, China' },
      { name: 'USA', country: 'United States', description: 'New York, USA' },
    ];
    console.log('Starting to seed import locations...');
    for (const importLocation of importLocations) {
      console.log(`Checking import location: ${importLocation.name}`);
      const existingImportLocation = await importLocationsService.findByName(importLocation.name);
      console.log(`Existing import location found:`, existingImportLocation ? 'Yes' : 'No');
      if (!existingImportLocation) {
        console.log(`Creating import location: ${importLocation.name}`);
        await importLocationsService.create(importLocation);
        console.log(`Created import location: ${importLocation.name}`);
      } else {
        console.log(`Import location already exists: ${importLocation.name}`);
      }
    }


    const email1 = 'ejike@solution.com';
    const email2 = 'divine@solution.com';
    // Check if users already exist
    const existingUser1 = await usersService.findByEmail(email1);
    const existingUser2 = await usersService.findByEmail(email2);

    if (existingUser1 && existingUser2) {
      console.log('Users already exist in database');
      return;
    }

    // Create test users (admins)
    const users = [
      { name: 'Ejike', email: email1, password: 'ejike123' },
      { name: 'Divine', email: email2, password: 'divine123' },
    ];

    for (const user of users) {
      const existingUser = await usersService.findByEmail(user.email);
      if (!existingUser) {
        await usersService.create(user.name, user.email, user.password);
        console.log(`Created user: ${user.name} (${user.email})`);
      }
    }

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
