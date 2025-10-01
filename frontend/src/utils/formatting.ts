// Utility functions for formatting financial data in the DomaLend application

/**
 * Format USDC amounts from 6-decimal storage format to human-readable format
 * @param amount - Amount in 6-decimal format (e.g., "1000000" = $1.00)
 * @returns Formatted string with commas (e.g., "1,000")
 */
export const formatUSDC = (amount: string | number): string => {
  const numAmount = typeof amount === 'string' ? parseInt(amount) : amount;
  const usdcAmount = numAmount / 1_000_000; // Convert from 6 decimals to human readable
  return usdcAmount.toLocaleString();
};

/**
 * Format basis points to percentage
 * @param basisPoints - Value in basis points (e.g., 2000 = 20.00%)
 * @returns Percentage string with 2 decimal places (e.g., "20.00")
 */
export const formatBasisPoints = (basisPoints: string | number): string => {
  const numBasisPoints = typeof basisPoints === 'string' ? parseInt(basisPoints) : basisPoints;
  const percentage = numBasisPoints / 10000; // Convert from 10,000 basis points to percentage
  return (percentage * 100).toFixed(2);
};

/**
 * Format basis points to percentage with % symbol
 * @param basisPoints - Value in basis points (e.g., 2000 = 20.00%)
 * @returns Percentage string with % symbol (e.g., "20.00%")
 */
export const formatBasisPointsWithSymbol = (basisPoints: string | number): string => {
  return `${formatBasisPoints(basisPoints)}%`;
};

/**
 * Format address for display (truncated)
 * @param address - Ethereum address
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Truncated address string (e.g., "0x1234...abcd")
 */
export const formatAddress = (address: string, startChars = 6, endChars = 4): string => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
};

/**
 * Format token ID for display (truncated)
 * @param tokenId - Token ID string
 * @param startChars - Number of characters to show at start (default: 8)
 * @param endChars - Number of characters to show at end (default: 8)
 * @returns Truncated token ID string
 */
export const formatTokenId = (tokenId: string | undefined, startChars = 8, endChars = 8): string => {
  if (!tokenId) return 'N/A';
  if (tokenId.length <= startChars + endChars) return tokenId;
  return `${tokenId.slice(0, startChars)}...${tokenId.slice(-endChars)}`;
};