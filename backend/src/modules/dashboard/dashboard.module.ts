import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { IndexerModule } from '../indexer/indexer.module';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [IndexerModule, DomainModule],
  controllers: [DashboardController],
  exports: []
})
export class DashboardModule {}