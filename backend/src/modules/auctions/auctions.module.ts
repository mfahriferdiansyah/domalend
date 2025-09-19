import { Module } from '@nestjs/common';
import { AuctionsController } from './controllers/auctions.controller';
import { AuctionPriceService } from './services/auction-price.service';
import { IndexerModule } from '../indexer/indexer.module';
import { DomainModule } from '../domain/domain.module';

@Module({
  imports: [IndexerModule, DomainModule],
  controllers: [AuctionsController],
  providers: [AuctionPriceService],
})
export class AuctionsModule {
  // Auctions module loaded
}