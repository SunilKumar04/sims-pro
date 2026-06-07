// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser = require('cookie-parser');
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 4000);

  // Frontend origins can be provided as a comma-separated allowlist.
  const clientUrls = new Set(
    configService
      .get<string>('CLIENT_URL', '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean),
  );
  const defaultDevOrigins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ];
  defaultDevOrigins.forEach((origin) => clientUrls.add(origin));
  const clientUrlPattern = configService.get<string>('CLIENT_URL_PATTERN');
  const clientUrlRegex = clientUrlPattern ? new RegExp(clientUrlPattern) : null;

  // ── Security ──
  app.use(helmet());
  app.use(cookieParser());

  // ── CORS (Production Ready) ──
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  });

  // ── Global Prefix & Versioning ──
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── Pipes & Filters ──
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger ──
  const config = new DocumentBuilder()
    .setTitle('SIMS Pro API')
    .setDescription('School Information Management System – REST API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT-Auth',
    )
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
  ║  API:    http://localhost:${port}/api/v1     ║
  ║  Docs:   http://localhost:${port}/api/docs   ║
  ║  Port:   ${port}                            ║
  ╚══════════════════════════════════════════════╝
  `);
}

bootstrap();
