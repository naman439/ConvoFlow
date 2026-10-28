import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  app.setGlobalPrefix(configService.get<string>('apiPrefix')!);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.enableCors();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ConvoFlow API')
    .setDescription('Production-grade real-time chat backend built with NestJS')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = configService.get<number>('port') ?? 3001;

  await app.listen(port);

  console.log(
    `🚀 ConvoFlow API running on http://localhost:${port}/${configService.get<string>('apiPrefix')}`,
  );

  console.log(`📚 Swagger Docs available at http://localhost:${port}/api/docs`);
}

void bootstrap();
