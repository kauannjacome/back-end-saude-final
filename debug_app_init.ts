import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app/app.module';

async function bootstrap() {
  try {
    console.log('Starting app initialization...');
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log', 'debug'] });
    console.log('App created, initializing...');
    await app.init();
    console.log('App initialized successfully');
    await app.close();
  } catch (error) {
    console.error('App failed to initialize:', error);
    process.exit(1);
  }
}
bootstrap();
