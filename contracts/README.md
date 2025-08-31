# DomaLend Smart Contracts

Smart contracts for the DomaLend domain-collateralized lending platform on Doma Protocol.

## Overview

DomaLend is a domain-collateralized lending platform that transforms tokenized domains into passive income assets. Domain owners can instantly access liquidity by borrowing against their domains, while USDC holders earn yield by providing liquidity to the lending pool.

**Core Value Proposition**: Turn tokenized domains into passive income via lending with transparent, pro-rata yield distribution.

## Core Concepts

### 📊 Points-Based Yield System
- **1:1 Staking Ratio** - Stake 1 USDC = Earn 1 point immediately  
- **Pro-rata Distribution** - All loan fees distributed proportionally by point ownership
- **Transparent Rewards** - No complex yield calculations, direct fee sharing
- **Instant Earning** - Start earning from new loan fees immediately after staking

### 🏦 Domain-Collateralized Loans
- **Instant Liquidity** - Get USDC immediately against domain collateral
- **AI-Powered Scoring** - Dynamic loan amounts based on domain value assessment
- **Flexible Terms** - Choose loan duration from 5 minutes to 365 days
- **50% Max LTV** - Conservative lending ratio ensures overcollateralization

### 🎯 Anti-Gaming Utilization System

**The Problem**: Without proper incentives, borrowers could game the system by:
1. Requesting long-term loans (365 days) to get the lowest base rates (8%)
2. Repaying immediately to avoid time-based interest
3. Effectively getting almost free loans (only 0.5% minimum fee)

**The Solution**: Dynamic utilization-based pricing that makes gaming expensive:

#### Base Rate Structure (Duration-Based)
```
< 1 hour:   50% APR (8% base + 42% risk premium)
< 6 hours:  30% APR (8% base + 22% risk premium) 
< 1 day:    20% APR (8% base + 12% risk premium)
< 7 days:   15% APR (8% base + 7% risk premium)
< 30 days:  10% APR (8% base + 2% risk premium)
≥ 30 days:   8% APR (base rate only)
```

#### Utilization Premium (Anti-Gaming)
```solidity
utilizationRate = totalBorrowed / totalLiquidity
utilizationPremium = (utilizationRate²) × 42% / 100²

Examples:
- 0% utilization:   +0% premium    (8% total for 30+ day loans)
- 50% utilization:  +10.5% premium (18.5% total for 30+ day loans) 
- 80% utilization:  +26.9% premium (34.9% total for 30+ day loans)
- 100% utilization: +42% premium   (50% total for 30+ day loans)
```

**Why This Works**:
- **Market-Driven Pricing**: As more people borrow, rates increase exponentially
- **Gaming Prevention**: High utilization makes long-term requests expensive
- **Self-Balancing**: High rates encourage repayment, freeing up liquidity
- **Fair Distribution**: Early borrowers get better rates, rewarding liquidity providers

### 🔨 Dutch Auction Liquidation
- **Automated Liquidation** - Loans auto-liquidate when they expire unpaid
- **Fair Price Discovery** - Auctions start at 2x loan amount, decrease 1% daily continuously
- **Community Benefit** - All auction proceeds distributed to point holders
- **Domain Recovery** - Buyers get full domain ownership after purchase

## Economic Incentives

### 🎯 **Who This Encourages**

#### ✅ **Lenders/Stakers (Highly Encouraged)**
- **Immediate Earning**: Start earning from all new loans instantly
- **Passive Income**: Set-and-forget staking with automatic distributions  
- **Upside Potential**: Higher yields during high utilization periods
- **Auction Bonuses**: Extra profits from liquidation auctions
- **No Impermanent Loss**: USDC-denominated returns only

#### ✅ **Responsible Borrowers (Encouraged)**
- **Instant Liquidity**: Get USDC immediately against domain value
- **Competitive Rates**: 8-10% APR for longer terms at low utilization
- **Flexible Terms**: Choose optimal duration based on needs
- **Asset Preservation**: Keep domain ownership after repayment

#### ❌ **Gaming Attempts (Strongly Discouraged)**
- **Dynamic Penalties**: Gaming attempts drive up utilization and rates
- **Exponential Costs**: Utilization premium makes abuse expensive
- **Market Response**: System automatically adjusts to prevent exploitation

### 📈 **Market Dynamics**

**Low Utilization (0-30%)**:
- Low rates (8-12% APR) encourage borrowing
- Attractive returns for lenders from volume
- System growth phase

**Medium Utilization (30-60%)**:  
- Moderate rates (12-25% APR) balance supply/demand
- Higher yields for lenders
- Optimal operating range

**High Utilization (60%+)**:
- High rates (25-50% APR) encourage repayment
- Maximum yields for lenders  
- Natural rate ceiling prevents over-borrowing

## Practical Examples

### 💡 **Example 1: Normal Borrowing (Encouraged)**
**Scenario**: Alice needs 5000 USDC for 30 days, utilization is 20%
- **Base Rate**: 10% APR (30-day loan)
- **Utilization Premium**: (20² × 42%) / 100² = 1.68% APR  
- **Total Rate**: 11.68% APR
- **30-day Cost**: ~48 USDC
- **Result**: ✅ Fair rate for legitimate borrowing

### 🚫 **Example 2: Gaming Attempt (Discouraged)**
**Scenario**: Bob tries to game by requesting 365-day loan but repaying in 1 day
- **Step 1**: Bob requests 10k USDC for 365 days when utilization is 40%
- **Base Rate**: 8% APR (365-day loan)
- **Utilization Premium**: (40² × 42%) / 100² = 6.72% APR
- **Total Rate**: 14.72% APR (higher due to his gaming attempt!)
- **Step 2**: Bob's large loan pushes utilization higher (let's say to 60%)
- **New Rate for Others**: (60² × 42%) / 100² = 15.12% premium = 23.12% total
- **Step 3**: Bob tries to repay after 1 day
- **Minimum Fee**: 50 USDC (0.5% of principal - can't avoid this)
- **Time-based Fee**: ~4 USDC (14.72% × 1/365 × 10k)  
- **Total Cost**: 50 USDC (same as legitimate 1-day loan)
- **Side Effect**: ❌ Made borrowing expensive for everyone else
- **Result**: 🚫 Gaming attempt failed, Bob pays same fee but creates negative externality

### 🎯 **Example 3: Smart Borrowing (Optimal)**
**Scenario**: Carol plans ahead and borrows appropriately
- **Need**: 8k USDC for 7 days, utilization is 15%
- **Base Rate**: 15% APR (7-day loan)  
- **Utilization Premium**: (15² × 42%) / 100² = 0.95% APR
- **Total Rate**: 15.95% APR
- **7-day Cost**: ~24 USDC
- **Result**: ✅ Optimal rate for actual usage pattern

### 💰 **Example 4: Lender Benefits**
**Scenario**: David stakes 50k USDC when pool has 200k total
- **Point Share**: 50k/200k = 25% of all fees
- **Monthly Volume**: 100k in loans, average 2% fees = 2k USDC fees
- **David's Share**: 25% × 2k = 500 USDC monthly (~12% APR)
- **Plus**: Auction proceeds when liquidations occur
- **Result**: ✅ Attractive passive yield for liquidity providers

## Contracts

- **DomaLend.sol** - Main contract with all lending logic
- **LoanCalculations.sol** - Interest and fee calculations
- **PointsCalculations.sol** - Staking and distribution logic
- **AuctionCalculations.sol** - Dutch auction pricing (continuous decay)
- **LiquidityCalculations.sol** - Pool management utilities

## Key Features

- **Smart Anti-Gaming** - Utilization-based exponential rate curve
- **Continuous Auctions** - Price decreases every second, not daily steps
- **1:1 Points System** - Simple, transparent yield distribution
- **Multi-Collateral Ready** - Extensible to other NFT types
- **Emergency Controls** - Development safety functions

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
