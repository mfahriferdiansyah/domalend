import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AuctionPriceService {
  private readonly logger = new Logger(AuctionPriceService.name);

  calculateCurrentPrice(startingPrice: string, auctionStartedAt: string): {
    currentPrice: string;
    decayPerSecond: string;
  } {
    const startingPriceBigInt = BigInt(startingPrice);
    const startTime = new Date(auctionStartedAt).getTime();
    const currentTime = Date.now();
    const elapsedMs = currentTime - startTime;

    if (elapsedMs < 0) {
      this.logger.warn(`Auction start time is in the future: ${auctionStartedAt}`);
      return {
        currentPrice: startingPrice,
        decayPerSecond: '0'
      };
    }

    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

    const decayFactor = Math.pow(0.99, elapsedDays);
    const currentPriceBigInt = BigInt(Math.floor(Number(startingPriceBigInt) * decayFactor));

    const dailyDecayRate = 0.01;
    const secondsPerDay = 86400;
    const decayPerSecondRate = dailyDecayRate / secondsPerDay;
    const decayPerSecondBigInt = BigInt(Math.floor(Number(currentPriceBigInt) * decayPerSecondRate));

    this.logger.debug(`Price calculation: starting=${startingPrice}, elapsed=${elapsedDays.toFixed(4)}d, current=${currentPriceBigInt.toString()}, decay/s=${decayPerSecondBigInt.toString()}`);

    return {
      currentPrice: currentPriceBigInt.toString(),
      decayPerSecond: decayPerSecondBigInt.toString()
    };
  }

  isAuctionExpired(auctionStartedAt: string, maxDurationDays: number = 30): boolean {
    const startTime = new Date(auctionStartedAt).getTime();
    const currentTime = Date.now();
    const elapsedMs = currentTime - startTime;
    const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

    return elapsedDays >= maxDurationDays;
  }

  calculateAuctionStatus(
    eventType: string,
    auctionStartedAt: string,
    bidderAddress?: string
  ): 'active' | 'completed' | 'expired' {
    if (bidderAddress && bidderAddress !== '0x0000000000000000000000000000000000000000') {
      return 'completed';
    }

    if (this.isAuctionExpired(auctionStartedAt)) {
      return 'expired';
    }

    return 'active';
  }
}