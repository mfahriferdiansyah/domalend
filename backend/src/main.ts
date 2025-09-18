import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security
  app.use(helmet());
  
  // CORS
  app.enableCors({
    origin: configService.get('CORS_ORIGINS')?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Global pipes
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

  // No API prefix - clean URLs
  // app.setGlobalPrefix('api/v2');

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('DomaLend API')
      .setDescription('AI-powered domain scoring and lending platform API')
      .setVersion('1.0')
      .addTag('domains', 'Domain scoring and valuation')
      .addTag('indexer', 'Indexer integration endpoints')
      .addTag('ai', 'AI services and configuration')
      .addTag('blockchain', 'Smart contract interactions')
      .addTag('external', 'External API integrations')
      .addTag('health', 'System health checks')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
    
    logger.log('📚 API Documentation available at: http://localhost:3001/docs');
  }

  // Start server
  const port = configService.get('PORT') || 3001;
  await app.listen(port);
  
  logger.log(`🚀 DomaLend Backend running on port ${port}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});