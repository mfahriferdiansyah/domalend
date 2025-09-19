import { Module } from '@nestjs/common';
import { PoolsController } from './controllers/pools.controller';
import { IndexerModule } from '../indexer/indexer.module';

@Module({
  imports: [IndexerModule],
  controllers: [PoolsController],
})
export class PoolsModule {}