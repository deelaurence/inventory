import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';

async function migrate() {
  console.log('Starting migration: Making all users admin...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    const count = await usersService.makeAllUsersAdmin();
    console.log(`Migration completed! ${count} users updated to admin.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await app.close();
  }
}

migrate();
