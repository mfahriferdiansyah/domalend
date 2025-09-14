import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { SmartContractService } from './services/smart-contract.service';
import { TransactionService } from './services/transaction.service';
import { WalletService } from './services/wallet.service';
import { ContractInteractionService } from './services/contract-interaction.service';

// Controllers
import { BlockchainController } from './controllers/blockchain.controller';
import { ContractController } from './controllers/contract.controller';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    SmartContractService,
    WalletService,
    TransactionService,
    ContractInteractionService,
  ],
  controllers: [BlockchainController, ContractController],
  exports: [
    SmartContractService,
    TransactionService,
    WalletService,
    ContractInteractionService,
  ],
})
export class BlockchainModule {}