import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*', // permite qualquer origem
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false, // deve ser false se origin for '*'
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Remove campos que não estão no DTO
      forbidNonWhitelisted: true, // (Opcional) Lança erro se vier campo que não está no DTO
      transform: true,            // Converte tipos (string para number, etc)
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
