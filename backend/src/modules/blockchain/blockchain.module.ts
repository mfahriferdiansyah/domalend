import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { SmartContractService } from './services/smart-contract.service';
import { TransactionService } from './services/transaction.service';
import { WalletService } from './services/wallet.service';

// Controllers
import { BlockchainController } from './controllers/blockchain.controller';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    SmartContractService,
    WalletService,
    TransactionService,
  ],
  controllers: [BlockchainController],
  exports: [
    SmartContractService,
    TransactionService,
    WalletService,
  ],
})
export class BlockchainModule {}