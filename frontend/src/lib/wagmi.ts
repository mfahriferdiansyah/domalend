import { domaTestnet } from '@/configs/wagmi'
import { createConfig, http } from 'wagmi'

export const wagmiConfig = createConfig({
  chains: [domaTestnet],
  transports: {
    [domaTestnet.id]: http()
  },
}) 