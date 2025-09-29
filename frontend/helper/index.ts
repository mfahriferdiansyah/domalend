import { HexAddress } from "@/types/general/address";

// Helper functions
export const calculatePrice = (tick: string): number => {
  return Math.pow(1.0001, parseInt(tick));
};

export const formatDate = (timestamp: string): string => {
  return new Date(parseInt(timestamp)).toLocaleString();
};

export const formatAddress = (address?: string): string => {
  if (!address) {
    return '';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Helper function to ensure address is properly typed
export const requireEnvAddress = (envVar: string | undefined, name: string): HexAddress => {
  if (!envVar) {
      throw new Error(`${name} environment variable is not defined`);
  }
  if (!envVar.startsWith('0x')) {
      throw new Error(`${name} must start with 0x`);
  }
  return envVar as HexAddress;
};