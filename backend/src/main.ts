// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);
  const clientUrl = configService.get<string>('CLIENT_URL', 'http://localhost:3000');

  // ── Security ──
  app.use(helmet());
  app.use(cookieParser());

  // ── CORS ──
  app.enableCors({
    origin: [clientUrl, 'http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ── Global Prefix & Versioning ──
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Global Pipes & Filters ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger API Docs ──
  const config = new DocumentBuilder()
    .setTitle('SIMS Pro API')
    .setDescription('School Information Management System – REST API Documentation')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT-Auth',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Students', 'Student management')
    .addTag('Teachers', 'Teacher management')
    .addTag('Classes', 'Class & section management')
    .addTag('Fees', 'Fee management')
    .addTag('Notices', 'Notice board')
    .addTag('Homework', 'Homework management')
    .addTag('Attendance', 'Attendance tracking')
    .addTag('Dashboard', 'Analytics & statistics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║      SIMS Pro – Backend Server Running       ║
  ╠══════════════════════════════════════════════╣
  ║  API:    http://localhost:${port}/api/v1          ║
  ║  Docs:   http://localhost:${port}/api/docs        ║
  ║  Port:   ${port}                                ║
  ╚══════════════════════════════════════════════╝
  `);
}

bootstrap();
