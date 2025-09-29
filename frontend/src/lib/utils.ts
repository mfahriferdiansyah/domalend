import { HexAddress } from "@/types/general/address";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatUnits } from 'viem'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatPrice = (price: string): string => {
  return Number(price).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatQuantity = (quantity: string): string => {
  return Number(quantity).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const formatAmount = (amount: string): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  }).format(Number(amount));
};

export const formatVolume = (value: number, decimals: number = 6) => {
  const num = parseFloat(value.toString())
  
  const config = {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }
  
  if (num >= 1e9) {
    return (num / 1e9).toLocaleString('en-US', config) + 'B'
  } else if (num >= 1e6) {
    return (num / 1e6).toLocaleString('en-US', config) + 'M'
  } else if (num >= 1e3) {
    return (num / 1e3).toLocaleString('en-US', config) + 'K'
  } else {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }
}

export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString("en-US", { hour12: false })
}
export const formatNumber = (
  value: string | number,
  options: {
    decimals?: number;
    compact?: boolean;
    notation?: 'standard' | 'scientific' | 'engineering' | 'compact';
  } = {}
) => {
  const {
    decimals = 0,
    compact = false,
    notation = compact ? 'compact' : 'standard'
  } = options;

  const num = typeof value === 'string' ? Number(value) : value;
  
  if (isNaN(num)) return '0';

  // Custom compact formatting with suffixes for different magnitudes
  if (compact || notation === 'compact') {
    const suffixes = ['', 'K', 'M', 'B', 'T', 'Q'];
    const suffixNum = Math.floor(Math.log10(Math.abs(num)) / 3);
    
    if (suffixNum >= 1 && suffixNum < suffixes.length) {
      const shortValue = (num / Math.pow(10, suffixNum * 3)).toFixed(decimals);
      return shortValue + suffixes[suffixNum];
    }
    
    // For extremely large numbers, use scientific notation
    if (suffixNum >= suffixes.length) {
      return num.toExponential(decimals);
    }
  }

  try {
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: notation === 'compact' ? 'standard' : notation,
    });

    return formatter.format(num);
  } catch (error) {
    // Fallback formatting
    return num.toString();
  }
}

export const calculateAge = (timestamp: number) => {
  const now = Math.floor(Date.now() / 1000)
  const ageInSeconds = now - timestamp

  // Convert to appropriate time unit
  if (ageInSeconds < 60) {
    return `${ageInSeconds}s`
  } else if (ageInSeconds < 3600) {
    return `${Math.floor(ageInSeconds / 60)}m`
  } else if (ageInSeconds < 86400) {
    return `${Math.floor(ageInSeconds / 3600)}h`
  } else {
    return `${Math.floor(ageInSeconds / 86400)}d`
  }
}

interface IconInfo {
  icon: string;
  bgColor: string;
}

export const getIconInfo = (tokenName: string): IconInfo => {
  const defaultIcon = '💎'
  const defaultBgColor = 'bg-blue-500'

  // Common token mappings
  const tokenMappings: Record<string, IconInfo> = {
    'WETH': { icon: '⚡', bgColor: 'bg-purple-500' },
    'ETH': { icon: '⚡', bgColor: 'bg-purple-500' },
    'USDC': { icon: '💵', bgColor: 'bg-green-500' },
    'USDT': { icon: '💵', bgColor: 'bg-green-500' },
    'BTC': { icon: '₿', bgColor: 'bg-orange-500' },
    'WBTC': { icon: '₿', bgColor: 'bg-orange-500' },
  }

  // Check for exact matches first
  if (tokenName in tokenMappings) {
    return tokenMappings[tokenName]
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(tokenMappings)) {
    if (tokenName.toUpperCase().includes(key)) {
      return value
    }
  }

  return { icon: defaultIcon, bgColor: defaultBgColor }
}