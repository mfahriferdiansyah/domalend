import { Module } from '@nestjs/common';
import { DashboardController } from './controllers/dashboard.controller';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [IndexerModule],
  controllers: [DashboardController],
  exports: []
})
export class DashboardModule {}