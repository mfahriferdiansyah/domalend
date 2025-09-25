import "dotenv/config";
import { createConfig } from "ponder";

// V2 Contract ABIs (will be added after contract deployment)
import { AIOracle_ABI } from "./abis/AIOracle";
import { DutchAuction_ABI } from "./abis/DutchAuction";
import { LoanManager_ABI } from "./abis/LoanManager";
import { SatoruLending_ABI } from "./abis/SatoruLending";

export default createConfig({
  chains: {
    domaTestnet: {
      id: 97476,
      rpc: process.env.DOMA_RPC_URL || "https://rpc-testnet.doma.xyz",
    },
  },
  contracts: {
    AIOracle: {
      chain: "domaTestnet",
      abi: AIOracle_ABI,
      address: process.env.AI_ORACLE_ADDRESS as `0x${string}` || "0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1",
      startBlock: parseInt(process.env.DEPLOYMENT_BLOCK || "10669000"),
    },
    SatoruLending: {
      chain: "domaTestnet",
      abi: SatoruLending_ABI,
      address: process.env.SATORU_LENDING_ADDRESS as `0x${string}` || "0x76435A7eE4d2c1AB98D75e6b8927844aF1Fb2F2B",
      startBlock: parseInt(process.env.DEPLOYMENT_BLOCK || "10669000"),
    },
    LoanManager: {
      chain: "domaTestnet",
      abi: LoanManager_ABI,
      address: process.env.LOAN_MANAGER_ADDRESS as `0x${string}` || "0x5365E0cf54Bccc157A0eFBb3aC77F826E27f9A49",
      startBlock: parseInt(process.env.DEPLOYMENT_BLOCK || "10669000"),
    },
    DutchAuction: {
      chain: "domaTestnet",
      abi: DutchAuction_ABI,
      address: process.env.DUTCH_AUCTION_ADDRESS as `0x${string}` || "0xF4eC2e259036A841D7ebd8A34fDC97311Be063d1",
      startBlock: parseInt(process.env.DEPLOYMENT_BLOCK || "10669000"),
    },
  },
});
