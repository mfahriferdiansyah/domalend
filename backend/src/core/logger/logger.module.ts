import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';

@Module({
  imports: [
    WinstonModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const logLevel = configService.get('logging.level');
        const nodeEnv = configService.get('nodeEnv');
        
        return {
          level: logLevel,
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json(),
            winston.format.prettyPrint(),
          ),
          defaultMeta: { service: 'domalend-backend' },
          transports: [
            // Console transport
            new winston.transports.Console({
              format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
                  return `${timestamp} [${context || 'App'}] ${level}: ${message} ${
                    Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
                  }`;
                }),
              ),
            }),
            
            // File transport for production
            ...(nodeEnv === 'production' ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
                format: winston.format.json(),
              }),
              new winston.transports.File({
                filename: 'logs/combined.log',
                format: winston.format.json(),
              }),
            ] : []),
          ],
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}