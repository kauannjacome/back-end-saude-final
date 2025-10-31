import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*', // permite qualquer origem
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false, // deve ser false se origin for '*'
  });


  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
