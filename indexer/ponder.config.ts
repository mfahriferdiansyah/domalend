import { createConfig } from "ponder";

// V2 Contract ABIs (will be added after contract deployment)
import { AIOracle_ABI } from "./abis/AIOracle";
import { SatoruLending_ABI } from "./abis/SatoruLending";
import { LoanManager_ABI } from "./abis/LoanManager";
import { DutchAuction_ABI } from "./abis/DutchAuction";

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
      address: process.env.AI_ORACLE_ADDRESS as `0x${string}` || "0xfc4dfd1fbe63edd52dfc90b23d760a1a4b84c67a",
      startBlock: parseInt(process.env.DEPLOYMENT_BLOCK || "10628096"),
    },
    SatoruLending: {
      chain: "domaTestnet", 
      abi: SatoruLending_ABI,
      address: process.env.SATORU_LENDING_ADDRESS as `0x${string}` || "0x42b3bde8b8d3bc5f1d640162de3836897c25d5db",
      startBlock: parseInt(process.env.DEPLOYMENT_BLOCK || "10628096"),
    },
    LoanManager: {
      chain: "domaTestnet",
      abi: LoanManager_ABI,
      address: process.env.LOAN_MANAGER_ADDRESS as `0x${string}` || "0x11960d694c550ec27705c9c0aea5a564df03970c",
      startBlock: parseInt(process.env.DEPLOYMENT_BLOCK || "10628096"),
    },
    DutchAuction: {
      chain: "domaTestnet",
      abi: DutchAuction_ABI,
      address: process.env.DUTCH_AUCTION_ADDRESS as `0x${string}` || "0x94bae20177ba09b778bcf99f9b83e0abed42f424",
      startBlock: parseInt(process.env.DEPLOYMENT_BLOCK || "10628096"),
    },
  },
});
