import { Module } from '@nestjs/common';
import { LoansController } from './controllers/loans.controller';
import { IndexerModule } from '../indexer/indexer.module';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [IndexerModule, DomainModule],
  controllers: [LoansController],
  providers: [],
  exports: [],
})
export class LoansModule {}