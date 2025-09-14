# DomaLend V2 Smart Contracts

**Domain-collateralized lending platform built on Foundry for the Doma Protocol ecosystem.**

DomaLend V2 enables users to unlock liquidity from their tokenized domain NFTs through AI-powered lending with automated Dutch auction liquidations.

## 🎯 **Status: Production Ready ✅**
- **All Tests Passing**: 80/80 comprehensive test suite
- **End-to-End Verified**: Complete loan-to-liquidation flow tested
- **Critical Bugs Fixed**: Dutch auction bidding race condition resolved
- **Integration Ready**: Full documentation for indexer and backend teams

## 🏗️ Architecture

The system consists of 4 core smart contracts working together:

```
AIOracle → SatoruLending → LoanManager → DutchAuction
    ↓           ↓              ↓            ↓
Event-driven   Pool mgmt    Loan lifecycle  Liquidation
AI scoring    & instant     & collateral    auctions
              loans         management
```

### Core Contracts

#### 1. **AIOracle.sol**
- **Purpose**: Event-driven AI scoring system for domain valuation
- **Key Functions**: `requestScoring()`, `submitScore()`, `scoreDomain()`
- **Integration**: Provides domain scores (0-100) for loan eligibility and pricing

#### 2. **SatoruLending.sol**
- **Purpose**: Multi-pool liquidity management and instant loan processing
- **Key Functions**: `createLiquidityPool()`, `requestInstantLoan()`, `addLiquidity()`
- **Features**: Custom lending criteria, instant loans, crowdfunded loans

#### 3. **LoanManager.sol**
- **Purpose**: Complete loan lifecycle management and collateral handling
- **Key Functions**: `createPoolBasedLoan()`, `repayLoan()`, `liquidateCollateral()`
- **Features**: Collateral locking, interest calculations, liquidation triggers

#### 4. **DutchAuction.sol**
- **Purpose**: Automated liquidation through decreasing-price auctions
- **Key Functions**: `startAuction()`, `placeBid()`, `getCurrentPrice()`
- **Features**: AI score-based reserve pricing, first bid wins, automatic refunds

## 🚀 Key Features

### Lending Mechanics
- **AI-Powered Scoring**: Domain valuation using machine learning models
- **Multiple Pool Types**: Custom lending criteria, instant approval, crowdfunding
- **Flexible Collateral**: Any Doma Protocol domain NFT as collateral
- **Simple Interest**: Transparent interest calculations with flexible terms

### Liquidation System
- **Dutch Auctions**: Price starts at 2x loan amount, decreases 1% daily
- **Reserve Pricing**: 40-80% of loan amount based on AI score
- **Instant Settlement**: First valid bid wins, immediate domain transfer
- **Pro-rata Distribution**: Auction proceeds distributed to lenders by share

### Security & Access Control
- **Role-based Access**: OpenZeppelin AccessControl for backend integration
- **Reentrancy Protection**: SafeERC20 and ReentrancyGuard throughout
- **Collateral Safety**: Secure domain custody and ownership transfers
- **Emergency Controls**: Pausable contracts and emergency auction cancellation

## 📊 Contract Statistics

| Contract | Lines of Code | Test Coverage | Key Features |
|----------|---------------|---------------|--------------|
| AIOracle | ~300 LOC | 29 tests ✅ | Event-driven scoring, batch operations |
| SatoruLending | ~600 LOC | 14 tests ✅ | Multi-pool system, instant loans |
| LoanManager | ~450 LOC | 13 tests ✅ | Loan lifecycle, collateral management |
| DutchAuction | ~450 LOC | 24 tests ✅ | Dutch auctions, automated liquidation |
| **Total** | **~1,800 LOC** | **80 tests** | **Complete lending ecosystem** |

## 🧪 Testing

**Comprehensive test suite with 100% pass rate:**

```shell
# Run all tests
$ forge test

# Run specific contract tests
$ forge test --match-contract AIOracle
$ forge test --match-contract SatoruLending
$ forge test --match-contract LoanManager
$ forge test --match-contract DutchAuction

# Run with verbose output
$ forge test -vv
```

### Test Categories
- **Unit Tests**: Individual function testing and edge cases
- **Integration Tests**: Cross-contract interaction workflows
- **End-to-End Tests**: Complete loan lifecycle scenarios
- **Security Tests**: Access control and reentrancy protection

## 🛠️ Development Setup

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Doma Protocol testnet access

### Installation
```shell
# Clone repository
$ git clone [repository-url]
$ cd contractsV2

# Install dependencies
$ forge install

# Build contracts
$ forge build
```

### Configuration
```shell
# Environment variables for deployment
PRIVATE_KEY=                    # Wallet private key for deployments
DOMA_RPC_URL=https://rpc-testnet.doma.xyz
USDC_ADDRESS=                   # USDC contract address on Doma testnet
DOMA_ADDRESS=                   # Doma Protocol contract address
```

## 📋 Usage

### Basic Commands
```shell
# Compile contracts
$ forge build

# Run test suite
$ forge test

# Format code
$ forge fmt

# Generate gas snapshots
$ forge snapshot
```

### Deployment
```shell
# Deploy complete DomaLend V2 system to Doma testnet
$ forge script script/Deploy.s.sol --rpc-url $DOMA_RPC_URL --private-key $PRIVATE_KEY --broadcast

# Verify contracts on explorer (after deployment)
$ forge verify-contract <CONTRACT_ADDRESS> src/<CONTRACT_NAME>.sol:<CONTRACT_NAME> --chain-id 97476
```

## 🚀 Live Deployment

**DomaLend V2 is deployed on Doma testnet (Chain ID: 97476)**

### Contract Addresses (LATEST - All Bugs Fixed ✅)
```
AIOracle:      0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1
SatoruLending: 0x76435A7eE4d2c1AB98D75e6b8927844aF1Fb2F2B
LoanManager:   0x5365E0cf54Bccc157A0eFBb3aC77F826E27f9A49
DutchAuction:  0xF4eC2e259036A841D7ebd8A34fDC97311Be063d1
```

### ✅ Recent Bug Fixes & Improvements
- **Dutch Auction Bidding**: Fixed race condition preventing valid bids
- **Emergency Rescue**: Added domain recovery function for stuck NFTs
- **Minimum Durations**: Removed artificial 1-hour restrictions
- **Backend Integration**: Authorized deployer as scoring service
- **Test Coverage**: 80/80 tests passing with end-to-end verification

### Dependency Contracts
```
USDC (Mock):     0x08CF67303E6ba2B80f5AFdE7ad926653145c6a7B
Doma Protocol:   0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f
```

### Quick Test
```shell
# Check if contracts are deployed
cast call 0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1 "owner()(address)" --rpc-url https://rpc-testnet.doma.xyz

# For detailed contract interaction examples, see docs/VERIFIED_TESTING_FLOW.md
```

## 🔗 Integration

### Doma Protocol Integration
- **Chain ID**: 97476 (Doma testnet)
- **RPC**: https://rpc-testnet.doma.xyz
- **Explorer**: https://explorer-testnet.doma.xyz
- **GraphQL**: https://api-testnet.doma.xyz/graphql

### Backend Integration
The contracts are designed for backend integration via:
- **Event Indexing**: All key actions emit detailed events
- **Role-based Access**: Backend services can submit AI scores
- **Real-time Updates**: WebSocket-compatible event streaming
- **GraphQL Support**: Compatible with The Graph protocol

## 🔄 Loan Lifecycle

### 1. **Loan Origination**
```solidity
// User requests loan with domain collateral
satoruLending.requestInstantLoan(params);
// → Triggers AI scoring via AIOracle
// → Creates loan via LoanManager if eligible
```

### 2. **Active Loan**
```solidity
// Borrower makes repayments
loanManager.repayLoan(loanId, amount);
// → Updates loan balance
// → Distributes payments to lenders
```

### 3. **Liquidation (if defaulted)**
```solidity
// Anyone can trigger liquidation for defaulted loans
loanManager.liquidateCollateral(loanId);
// → Starts Dutch auction via DutchAuction
// → Price decreases over time until sold
```

## 📈 Advanced Features

### AI Domain Scoring
- Scores domains 0-100 based on multiple factors
- Age, extension, length, keywords, traffic data
- Real-time scoring updates via backend integration
- Cached scores with configurable refresh intervals

### Dutch Auction Mechanics
- **Starting Price**: 2x total owed amount
- **Price Decay**: Linear decrease, 1% per day
- **Reserve Price**: AI score-based (40-80% of loan)
- **Settlement**: First valid bid wins immediately

### Multi-Pool System
- **Instant Pools**: Algorithm-based instant approval
- **Custom Pools**: Lender-defined criteria and rates
- **Crowdfunded Loans**: Community-funded loan requests
- **Pool Analytics**: Performance tracking and statistics

## 🔒 Security Considerations

- **Access Controls**: Role-based permissions for all sensitive functions
- **Reentrancy Guards**: Protection on all external value transfers
- **Safe Arithmetic**: Using Solidity 0.8.20+ overflow protection
- **Domain Custody**: Secure collateral handling during loan period
- **Emergency Procedures**: Pausable contracts and emergency controls

## 📚 Documentation

### Core Documentation
- [Verified Testing Flow](./docs/VERIFIED_TESTING_FLOW.md) - Complete end-to-end testing guide
- [Cast Commands Reference](./docs/CAST_COMMANDS.md) - All contract interaction commands
- [Dutch Auction Bug Analysis](./docs/DUTCH_AUCTION_BIDDING_BUG_ANALYSIS.md) - Technical bug fix details

### Integration Guides
- [Indexer Integration](./docs/INDEXER_INTEGRATION.md) - Ponder/Graph Protocol setup
- [Backend Integration](./docs/BACKEND_INTEGRATION.md) - NestJS service architecture
- [Frontend Integration](./docs/FRONTEND_INTEGRATION.md) - Web3 wallet connection guide

### External References
- [Foundry Book](https://book.getfoundry.sh/)
- [Doma Protocol Docs](https://docs.doma.xyz/)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests for new functionality
4. Ensure all tests pass (`forge test`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**DomaLend V2** - Turning domains into liquidity through AI-powered lending 🚀