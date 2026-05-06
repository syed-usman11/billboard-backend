import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cors from 'cors';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const nodeEnv = configService.get('NODE_ENV');
  const port = configService.get('PORT') || 3001;
  const frontendUrl = configService.get('FRONTEND_URL');

  // Security middleware
  app.use(helmet());

  // Allowed origins - support multiple Vercel deployments
  const allowedOrigins = [
    'http://localhost:3000',
    'https://adv-app-two.vercel.app',
  ];

  if (frontendUrl && !allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // Allow any vercel.app subdomain
      if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    optionsSuccessStatus: 200,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  await app.listen(port, '0.0.0.0', () => {
    logger.log(`🚀 Server running on http://0.0.0.0:${port}`);
    logger.log(`📡 Environment: ${nodeEnv}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
