import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Segurança e Otimização
  app.use(helmet());
  app.use(compression());

  // Usar Logger do Pino
  app.useLogger(app.get(Logger));

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

  // Configuração do Swagger
  const config = new DocumentBuilder()
    .setTitle('Saúde API')
    .setDescription('API do sistema de gestão de saúde')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
