import contractArtifact from '../contracts/src/Rupiah.sol/Rupiah.json';

export const contractAddress = process.env.NEXT_PUBLIC_DOMA_PROTOCOL_ADDRESS || '0x416A260A6ab809D417D1374624C7647A80F1dfCe';
export const contractABI = contractArtifact.abi;