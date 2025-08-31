# DomaLend Smart Contracts

Smart contracts for the DomaLend domain-collateralized lending platform on Doma Protocol.

## Overview

DomaLend enables domain owners to use their tokenized domains as collateral for USDC loans, while allowing users to stake USDC and earn yield from loan repayments through a points-based system.

## Contracts

- **DomaLend.sol** - Main contract handling staking, loans, and Dutch auctions
- **MockUSDC.sol** - Mock USDC token for testing (6 decimals)
- **MockDoma.sol** - Mock domain NFT contract for testing
- **MockOracle.sol** - Mock AI oracle for domain scoring

## Key Features

- **1:1 Points System** - Stake 1 USDC to earn 1 point
- **Pro-rata Distribution** - Loan repayments distributed proportionally to point holders
- **Dutch Auctions** - Liquidations start at 2x loan amount, decrease 1% daily
- **Domain Collateral** - NFT domains held as collateral until loan repaid

## Setup

1. Install Foundry:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

2. Install dependencies:
```bash
forge install
```

3. Set up environment:
```bash
cp .env.example .env
# Add your private key to .env
```

## Development

Build contracts:
```bash
forge build
```

Run tests:
```bash
forge test
```

Deploy to Doma testnet:
```bash
forge script script/Deploy.s.sol --rpc-url doma --broadcast
```

## Testing

The test suite covers:
- Staking and unstaking USDC for points
- Requesting loans with domain collateral
- Repaying loans and automatic distribution
- Dutch auction liquidation mechanics
- Points-based yield distribution

All tests are passing with comprehensive coverage of core functionality.

## Architecture

- Single contract design for simplicity
- OpenZeppelin contracts for security (ERC20, ERC721, ReentrancyGuard, Ownable)
- Event-driven for easy indexing with Ponder
- Simple 1:1 points system eliminates complex yield calculations
