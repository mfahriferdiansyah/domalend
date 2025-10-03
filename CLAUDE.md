# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DomaLend is an AI-powered domain scoring and lending platform built on the Doma blockchain testnet. The system enables users to borrow against tokenized domain NFTs using AI-powered valuations and automated liquidation mechanisms.

## Architecture

The project consists of four main components:

### 1. Smart Contracts (`contractsV2/`)
Foundry-based Solidity contracts (v0.8.20) deployed on Doma testnet (ChainID: 97476)

**Core Contracts:**
- `AIOracle.sol` - Event-driven AI scoring system (0-100 scores, 24h validity)
- `SatoruLending.sol` - Multi-pool liquidity management and instant loans
- `LoanManager.sol` - Complete loan lifecycle and collateral management
- `DutchAuction.sol` - Automated liquidation via Dutch auctions

**Deployed Addresses (Doma Testnet):**
- AIOracle: `0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1`
- SatoruLending: `0x76435A7eE4d2c1AB98D75e6b8927844aF1Fb2F2B`
- LoanManager: `0x5365E0cf54Bccc157A0eFBb3aC77F826E27f9A49`
- DutchAuction: `0xF4eC2e259036A841D7ebd8A34fDC97311Be063d1`

### 2. Backend API (`backend/`)
NestJS-based REST API with TypeORM, PostgreSQL/SQLite support

**Module Structure:**
- `domain/` - Domain scoring and management
- `contracts/` - Blockchain interaction services
- `loans/` - Loan data and history
- `pools/` - Liquidity pool management
- `auctions/` - Dutch auction tracking
- `liquidation/` - Liquidation monitoring
- `dashboard/` - Analytics and statistics
- `ai/` - OpenAI integration for domain valuation
- `health/` - System health checks

### 3. Indexer (`indexer/`)
Ponder v0.12-based blockchain event indexer with real-time processing

**Key Features:**
- Real-time event indexing from all DomaLend contracts
- Automated liquidation monitoring (runs every 10 seconds)
- Domain analytics and scoring history
- GraphQL API for querying indexed data

### 4. Frontend (`frontend/`)
Next.js 14 application with RainbowKit wallet integration

## Common Commands

### Backend
```bash
# Development
cd backend
npm run start:dev          # Start with hot-reload
npm run build             # Build for production
npm run start:prod        # Run production build

# Testing
npm test                  # Run unit tests
npm run test:watch        # Watch mode
npm run test:cov          # With coverage
npm run test:e2e          # E2E tests

# Database
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
npm run schema:sync       # Sync schema (dev only)
npm run db:seed          # Run seeders

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier
```

**API Documentation:** When backend runs in development mode, Swagger docs are available at `http://localhost:3001/docs`

### Indexer
```bash
cd indexer
pnpm dev                 # Start development server with hot-reload
pnpm start               # Start production server
pnpm codegen             # Generate types from ABIs
pnpm db                  # Database management commands
pnpm typecheck           # TypeScript type checking
pnpm lint                # ESLint
```

**GraphQL API:** Available at `http://localhost:42069` when running

### Smart Contracts
```bash
cd contractsV2

# Development
forge build              # Compile contracts
forge test               # Run all tests (80 tests)
forge test -vv           # Verbose output
forge test --match-contract AIOracle  # Test specific contract
forge fmt                # Format code
forge snapshot           # Gas snapshots

# Deployment
forge script script/Deploy.s.sol --rpc-url $DOMA_RPC_URL --private-key $PRIVATE_KEY --broadcast

# Contract Interaction
cast call <ADDRESS> "<SIGNATURE>" --rpc-url https://rpc-testnet.doma.xyz
cast send <ADDRESS> "<SIGNATURE>" [ARGS] --rpc-url https://rpc-testnet.doma.xyz --private-key $PRIVATE_KEY
```

### Frontend
```bash
cd frontend
pnpm dev                 # Development server
pnpm build               # Production build
pnpm start               # Start production server
pnpm lint                # Next.js linting
```

## Key Workflows

### Domain Scoring Flow
1. User requests domain scoring via AIOracle contract
2. Indexer detects `ScoringRequested` event
3. Indexer calls backend API `/contracts/submit-score`
4. Backend analyzes domain (AI + external APIs)
5. Backend submits score back to AIOracle contract
6. Score stored on-chain with 24h validity

### Loan Creation Flow
1. User requests loan via SatoruLending contract
2. Contract checks domain score via AIOracle
3. If approved, LoanManager creates loan and locks collateral
4. Funds transferred to borrower
5. Indexer tracks loan state changes

### Liquidation Flow
1. Indexer monitors loans every 10 seconds
2. When loan defaults, backend calls `liquidateCollateral()`
3. LoanManager initiates Dutch auction via DutchAuction contract
4. Auction price decreases linearly (2x loan amount → reserve price)
5. First valid bid wins, domain transferred to bidder
6. Proceeds distributed to lenders pro-rata

## Database Architecture

### Backend Database (TypeORM)
- **Domain Entities** - Domain info, scores, and metadata
- **Loan Entities** - Loan records and repayment history
- **Pool Entities** - Liquidity pool data and analytics
- **Auction Entities** - Auction tracking and bid history

### Indexer Database (Ponder)
Schema defined in `indexer/ponder.schema.ts`:
- Event logs from all smart contracts
- Aggregated statistics and analytics
- Historical snapshots for time-series data

## Environment Configuration

### Backend `.env`
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=sqlite:./data/domalend.db  # or PostgreSQL
BLOCKCHAIN_RPC_URL=https://rpc-testnet.doma.xyz
BLOCKCHAIN_PRIVATE_KEY=<your_key>
AI_ORACLE_ADDRESS=0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1
DOMA_SUBGRAPH_URL=https://api-testnet.doma.xyz/graphql
PONDER_GRAPHQL_URL=http://localhost:42069
```

### Indexer `.env`
```env
DOMA_RPC_URL=https://rpc-testnet.doma.xyz
AI_ORACLE_ADDRESS=0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1
SATORU_LENDING_ADDRESS=0x76435A7eE4d2c1AB98D75e6b8927844aF1Fb2F2B
LOAN_MANAGER_ADDRESS=0x5365E0cf54Bccc157A0eFBb3aC77F826E27f9A49
DUTCH_AUCTION_ADDRESS=0xF4eC2e259036A841D7ebd8A34fDC97311Be063d1
DEPLOYMENT_BLOCK=10669000
```

## Important Implementation Notes

### Smart Contract Changes
- Always update ABIs in `indexer/abis/` after contract changes
- Run `pnpm codegen` in indexer to regenerate types
- Update contract addresses in both backend and indexer `.env` files
- Ensure tests pass: `forge test` (all 80 tests must pass)

### Event Indexing
- All critical contract actions emit events
- Indexer handles events in `indexer/src/`
- When adding new events, update both contract and indexer handlers
- Indexer processes events in real-time with block confirmations

### Backend Services
- Domain scoring uses OpenAI API (configurable in `modules/ai/`)
- External APIs (Ahrefs, SEMrush) are optional, mock data used as fallback
- All blockchain interactions go through `modules/contracts/`
- Database migrations must be generated and run for schema changes

### Testing Strategy
- **Contracts**: Comprehensive Foundry tests (80 tests covering all scenarios)
- **Backend**: Jest unit tests for services, E2E tests for API endpoints
- **Indexer**: Test event handlers with mock events
- Always verify end-to-end flow: scoring → loan → liquidation

## Blockchain Details

**Doma Testnet:**
- Chain ID: 97476
- RPC: https://rpc-testnet.doma.xyz
- Explorer: https://explorer-testnet.doma.xyz
- GraphQL: https://api-testnet.doma.xyz/graphql
- Faucet: Available via Doma docs

## Technology Stack

- **Contracts**: Solidity 0.8.20, OpenZeppelin, Foundry
- **Backend**: NestJS 10, TypeORM, ethers.js v6, OpenAI API
- **Indexer**: Ponder v0.12, Viem v2, Hono
- **Frontend**: Next.js 14, Wagmi v2, RainbowKit, TanStack Query
- **Database**: PostgreSQL (prod), SQLite (dev), Ponder's internal DB
