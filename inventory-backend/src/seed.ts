import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import * as bcrypt from 'bcrypt';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);

  try {
    // Check if users already exist
    const existingUser1 = await usersService.findByEmail('email@test.com');
    const existingUser2 = await usersService.findByEmail('user2@test.com');

    if (existingUser1 && existingUser2) {
      console.log('Users already exist in database');
      return;
    }

    // Create test users
    const users = [
      { email: 'email@test.com', password: 'password123' },
      { email: 'user2@test.com', password: 'password123' },
    ];

    for (const user of users) {
      const existingUser = await usersService.findByEmail(user.email);
      if (!existingUser) {
        await usersService.create(user.email, user.password);
        console.log(`Created user: ${user.email}`);
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
