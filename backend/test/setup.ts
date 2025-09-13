import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

// Set default test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'sqlite::memory:';
process.env.BLOCKCHAIN_RPC_URL = process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545';
process.env.BLOCKCHAIN_PRIVATE_KEY = process.env.BLOCKCHAIN_PRIVATE_KEY || '0x' + '0'.repeat(64);
process.env.AI_ORACLE_ADDRESS = process.env.AI_ORACLE_ADDRESS || '0x' + '1'.repeat(40);
process.env.DOMALEND_ADDRESS = process.env.DOMALEND_ADDRESS || '0x' + '2'.repeat(40);

// Global test timeout
jest.setTimeout(30000);