import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services - only what ContractController needs
import { ContractInteractionService } from './services/contract-interaction.service';
import { SmartContractService } from './services/smart-contract.service';
import { WalletService } from './services/wallet.service';

// Controllers - only the ContractController
import { ContractController } from './controllers/contract.controller';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [
    SmartContractService,
    WalletService,
    ContractInteractionService,
  ],
  controllers: [ContractController],
})
export class ContractsModule {}