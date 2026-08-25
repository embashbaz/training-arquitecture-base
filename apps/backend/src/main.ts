// apps/backend/src/main.ts
import 'dotenv/config'; // <-- This must be the very first line!
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // The task requires the backend to run on port 3001
  await app.listen(3001); 
}
bootstrap();
