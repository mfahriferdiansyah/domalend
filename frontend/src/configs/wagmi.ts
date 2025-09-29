import { createConfig } from 'wagmi';
import { http } from 'viem';
import { Chain } from 'viem/chains';
import { createStorage } from 'wagmi';

export const projectId = 'c8d08053460bfe0752116d730dc6393b';

export const domaTestnet: Chain = {
	id: 97476,
	name: 'Doma Testnet',
	nativeCurrency: {
		decimals: 18,
		name: 'Doma',
		symbol: 'DOMA',
	},
	rpcUrls: {
		default: {
			http: ['https://rpc-testnet.doma.xyz'],
		},
		public: {
			http: ['https://rpc-testnet.doma.xyz'],
		},
	},
	blockExplorers: {
		default: {
			name: 'Doma Explorer',
			url: 'https://explorer-testnet.doma.xyz',
		},
	},
	testnet: true,
};

export const wagmiConfig = createConfig({
	chains: [domaTestnet],
	transports: {
		[domaTestnet.id]: http(domaTestnet.rpcUrls.default.http[0]),
	},
	storage: createStorage({
		storage: typeof window !== 'undefined' ? window.localStorage : undefined,
	}),
});
