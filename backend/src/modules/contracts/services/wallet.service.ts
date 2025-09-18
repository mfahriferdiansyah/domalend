import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletService {
  async getWalletInfo() {
    return {
      address: '0x123...',
      balance: '100',
    };
  }
}