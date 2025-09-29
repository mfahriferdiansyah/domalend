import { HexAddress } from "@/types/general/address";
import contractAddresses from "./contract-address.json";

export enum ContractName {
    clobBalanceManager = "PROXY_BALANCEMANAGER",
    clobPoolManager = "PROXY_POOLMANAGER",
    clobRouter = "PROXY_ROUTER",
    chainBalanceManager = "PROXY_CHAINBALANCEMANAGER",
    openIntentRouter = "OPEN_INTENT_ROUTER",
    usdc = "USDC",
    weth = "WETH",
    wbtc = "WBTC",
    router = "ROUTER",
    faucet = "PROXY_FAUCET",
}

interface MailchimpConfig {
    API_KEY: string;
    AUDIENCE_ID: string;
    API_SERVER: string;
}

interface ContractConfig {
    DEFAULT_CHAIN: string;
    FAUCET_ADDRESS: HexAddress | string;
    MARKET_FACTORY_ADDRESS: HexAddress | string;
    ORACLE_ADDRESS: HexAddress | string;
    ORDER_VAULT_ADDRESS: HexAddress | string;
    ROUTER_ADDRESS: HexAddress | string;
    TARGET_DOMAIN: string;
    DESTINATION_DOMAIN: string;
    MAILBOX_ADDRESS: HexAddress | string;
    NETWORK: string;
    ROUTER_OWNER: HexAddress | string;
    ENABLED_CHAINS: string;
    MAILCHIMP?: MailchimpConfig;
    [chainId: string]: Partial<Record<ContractName, string>> | string | MailchimpConfig | undefined;
}

// Extract contract config
const contractsConfig = contractAddresses as ContractConfig;

// Extract global config from contracts
export const DEFAULT_CHAIN = contractsConfig.DEFAULT_CHAIN;
export const FAUCET_ADDRESS = contractsConfig.FAUCET_ADDRESS as HexAddress;
export const MARKET_FACTORY_ADDRESS = contractsConfig.MARKET_FACTORY_ADDRESS as HexAddress;
export const ORACLE_ADDRESS = contractsConfig.ORACLE_ADDRESS as HexAddress;
export const ORDER_VAULT_ADDRESS = contractsConfig.ORDER_VAULT_ADDRESS as HexAddress;
export const ROUTER_ADDRESS = contractsConfig.ROUTER_ADDRESS as HexAddress;
export const TARGET_DOMAIN = contractsConfig.TARGET_DOMAIN;
export const DESTINATION_DOMAIN = contractsConfig.DESTINATION_DOMAIN;
export const MAILBOX_ADDRESS = contractsConfig.MAILBOX_ADDRESS as HexAddress;
export const NETWORK = contractsConfig.NETWORK;
export const ROUTER_OWNER = contractsConfig.ROUTER_OWNER as HexAddress;
export const ENABLED_CHAINS = contractsConfig.ENABLED_CHAINS;

// Using env
export const MAILCHIMP = {
  API_KEY: process.env.NEXT_PUBLIC_MAILCHIMP_API_KEY || '',
  AUDIENCE_ID: process.env.NEXT_PUBLIC_MAILCHIMP_AUDIENCE_ID || '',
  API_SERVER: process.env.NEXT_PUBLIC_MAILCHIMP_API_SERVER || '',
};

export function getContractAddress(
    chainId: string | number = DEFAULT_CHAIN,
    contractName: ContractName
): string {
    const chainIdString = chainId.toString();
    const chainContracts = contractsConfig[chainIdString] as Partial<Record<ContractName, string>>;

    if (!chainContracts) {
        throw new Error(`Chain ID ${chainIdString} not found in configuration`);
    }

    const address = chainContracts[contractName];

    // TODO: remove this
    // if (!address) {
    //     throw new Error(
    //         `Contract ${contractName} not found for chain ID ${chainIdString}`
    //     );
    // }

    return address || '';
}