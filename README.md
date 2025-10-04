# DomaLend 🌐💰

**AI-Powered Domain Lending Protocol with Zero-Knowledge Proof Verification**

Unlock liquidity from tokenized domain NFTs through multi-agent AI scoring, cryptographically verified with zero-knowledge proofs (zkFetch) and secured by EigenLayer AVS. The first protocol to enable borrowing against DNS domains using decentralized AI consensus.

[![GitHub](https://img.shields.io/badge/GitHub-DomaLend-black?logo=github)](https://github.com/mfahriferdiansyah/domalend)
[![Doma Testnet](https://img.shields.io/badge/Doma-Testnet-blue)](https://explorer-testnet.doma.xyz)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🎥 Live Demo

- 🔗 **[Try DomaLend Website](https://domalend.xyz)** - See the website
- 📺 **[Watch Demo Video](https://youtube.com/domalend-demo)** - See AI-verified domain scoring in action

---

## 🎯 What is DomaLend?

DomaLend is a **decentralized lending protocol** that enables domain NFT holders to **borrow cryptocurrency** against their domains without selling them.

The protocol uses **AI-powered scoring with zero-knowledge proofs** (zkFetch) to provide fair, transparent, and cryptographically verifiable domain valuations through a **multi-agent AI architecture** where multiple AI models (OpenAI, Claude, Gemini) reach consensus—ensuring no single AI controls the result.

**Domain-as-Collateral Lending-as-a-Service** transforms tokenized DNS domains from traded assets into productive capital through AI-driven valuation and automated risk management.

### Key Innovation

Unlike traditional domain appraisals that rely on centralized oracles or subjective human judgment, DomaLend leverages:

- ✅ **Decentralized AI Scoring** - AVS operators can run using multiple AI models to analyze with zkFetch proofs
- ✅ **Zero-Knowledge Verification** - Cryptographic proofs ensure scoring integrity
- ✅ **Automated Liquidation** - Dutch auction mechanism protects lenders
- ✅ **Multi-Pool Liquidity** - Isolated risk pools for different domain tiers
- ✅ **Real-Time Indexing** - Blockchain event tracking with instant GraphQL access

---

## 🔥 The Problem

### Domain Tokenization Enables Trading, Not Financial Utility

Domain tokenization has enabled on-chain trading, but it still hasn't enabled **real financial utility**.

Today, domain holders can **sell** tokenized domains, but they **can't borrow** against them. There's no objective valuation oracle to determine fair loan-to-value ratios, and DeFi lenders lack a trust-minimized verification layer.

As a result, tokenized domains remain **traded assets — not productive capital**.

### The Market Gap is Massive

- **359 million** registered domains globally
- **$30 million** top sale (voice.com)
- **$1.1 billion+** in annual secondary market sales
- **$300 billion** total market value

**Despite this huge market, there are ZERO lending protocols supporting tokenized DNS domains.**

### Root Cause: Four Critical Missing Pieces

1. **No Decentralized Valuation** - Marketplaces support trading, but not verifiable pricing
2. **Opaque AI Models** - Current appraisers (GoDaddy, Estibot) are off-chain and unverifiable
3. **Missing Trust Layer** - Lenders can't rely on AI pricing without cryptographic validation
4. **No Lending Infrastructure** - Tokenization allows ownership, but not borrowing

### Impact

- Domain holders have **no access to liquidity** unless they sell
- Marketplaces encourage **speculation**, not productivity
- DeFi misses a **stable, reputation-linked collateral type**
- A **$300 billion market** remains disconnected from on-chain finance

> _"We can trade tokenized domains, but until we can borrow against them, they're not truly financial assets."_

---

## 💡 Our Solution

DomaLend transforms tokenized DNS domains from static assets into productive capital through three core innovations:

### 1. Domain-as-Collateral Lending-as-a-Service 🏦

Unlock instant liquidity from DNS domains through AI-powered valuations. Borrowers get loans in seconds, lenders earn fixed APR yields, and domains remain productive assets while serving as collateral.

**Flow:**

```
Domain NFT → AI Valuation (verified) → Instant Loan Approval →
Collateral Locked → Funds Released → Repay or Liquidate
```

### 2. Verifiable AI Agent Scoring 🤖

Multiple AI agents (OpenAI, Claude, Gemini, local LLMs) process domain valuations off-chain. Results are validated by EigenLayer AVS operators using Zero-Knowledge TLS proofs for privacy and authenticity.

**Innovation:**

- No single model controls the result — it's decentralized and consensus-driven
- Every valuation is AI-generated, AVS-verified, and publicly auditable
- Cryptographic proofs ensure trustless verification of AI responses
- Model-agnostic architecture — operators choose their preferred AI provider

### 3. Fixed APR Lending Pools 📊

Lenders earn predictable returns through transparent smart contracts. Multiple isolated pools with different risk/reward profiles enable risk-adjusted lending across all domain quality tiers.

**Features:**

- Pool-specific LTV ratios (10%-75% based on domain tier)
- Fixed interest rates set by pool creators
- Pro-rata profit distribution to liquidity providers
- Automated liquidation via Dutch auctions

---

## ⚙️ How It Works

### User Flow: Borrowing Against a Domain

```
1. User owns domain NFT (minted on Doma blockchain)
   ↓
2. User requests paid AI scoring (pays 1 USDC)
   ↓
3. AIOracle emits ScoringRequested event
   ↓
4. AVS Operator detects event and processes:
   - Resolves domain name from tokenId
   - Calls chosen AI model via zkFetch (generates ZK proof)
   - Parses score (0-100) and confidence
   - Uploads full analysis to IPFS
   ↓
5. Operator submits score + IPFS hash + ZK proof on-chain
   ↓
6. User receives verified score (valid 24h)
   ↓
7. User creates loan request:
   - Selects liquidity pool
   - Specifies loan amount (within LTV limits)
   - Sets loan duration (7-90 days)
   - Approves domain NFT transfer
   ↓
8. SatoruLending validates:
   - Score validity (not expired)
   - LTV ratio (e.g., 45% for Tier 3 domains)
   - Pool has sufficient liquidity
   ↓
9. LoanManager creates loan:
   - Locks domain NFT as collateral
   - Transfers loan amount to borrower
   - Records loan terms on-chain
   ↓
10. Borrower uses funds (no credit checks, instant approval!)
```

### Repayment & Liquidation

**Happy Path (Repayment):**

```
Borrower repays loan + interest before deadline
   ↓
LoanManager releases domain NFT back to borrower
   ↓
Interest distributed to pool liquidity providers
```

**Unhappy Path (Default):**

```
Loan deadline passes without repayment
   ↓
Indexer detects default (runs every 10 seconds)
   ↓
Backend triggers liquidation:
   - Calls LoanManager.liquidateCollateral()
   - Initiates Dutch auction via DutchAuction contract
   ↓
Auction starts at 2x loan amount, decays to reserve price
   ↓
First valid bid wins:
   - Auction ends immediately
   - Domain transferred to winning bidder
   - Proceeds sent to pool lenders (pro-rata)
   ↓
Bad debt covered by pool reserves
```

---

## 🏗️ Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│  │  Scoring │  │   Loan   │  │  Lender  │  │ Auctions │          │
│  │    UI    │  │ Creation │  │Dashboard │  │    UI    │          │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│         │              │              │              │           │
│         └──────────────┴──────────────┴──────────────┘           │
│                         │ (Wagmi + ethers.js)                    │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│              BLOCKCHAIN (Doma Testnet - ChainID 97476)           │
│                                                                  │
│  ┌───────────┐  ┌────────────┐  ┌──────────┐  ┌─────────────┐    │
│  │ AIOracle  │◄─┤  Satoru    │◄─┤   Loan   │◄─┤   Dutch     │    │
│  │           │  │  Lending   │  │ Manager  │  │  Auction    │    │
│  └─────┬─────┘  └────────────┘  └──────────┘  └─────────────┘    │
│        │                                                         │
│        │ emits: DomainScoringTaskCreated                         │
│        ▼                                                         │
│  ┌────────────────────────────────────────┐                      │
│  │ DomalendServiceManager (EigenLayer AVS)│                      │
│  └────────────────────────────────────────┘                      │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          │ (event polling)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                   AVS OPERATOR (TypeScript)                      │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  1. Detect DomainScoringTaskCreated event                 │   │
│  │  2. Resolve domain name from tokenId (NFT contract)       │   │
│  │  3. Call AI model via zkFetch (Reclaim Protocol)          │   │
│  │     • Operators choose: OpenAI, Claude, Gemini, etc.      │   │
│  │  4. Generate zero-knowledge proof of API response         │   │
│  │  5. Parse score, confidence, reasoning from JSON          │   │
│  │  6. Upload full analysis + zkProof to IPFS (Pinata)       │   │
│  │  7. Submit score + IPFS hash to ServiceManager            │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Model-Agnostic Architecture:                                    │
│  • Any AI provider (OpenAI, Anthropic, Google, local LLMs)       │
│  • Only score (0-100) matters on-chain                           │
│  • zkFetch verifies API responses cryptographically              │
│                                                                  │
│  Dependencies:                                                   │
│  - @reclaimprotocol/zk-fetch: ZK proof generation                │
│  - ethers.js: Blockchain interaction                             │
│  - pinata: IPFS storage                                          │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          │ (writes on-chain)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    INDEXER (Ponder v0.12)                        │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Real-Time Event Processing:                              │   │
│  │  • AIOracle: ScoringRequested, DomainScoreSubmitted       │   │
│  │  • SatoruLending: PoolCreated, Deposited, Withdrawn       │   │
│  │  • LoanManager: LoanCreated, LoanRepaid                   │   │
│  │  • DutchAuction: AuctionStarted, AuctionEnded             │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Liquidation Monitoring Cron (every 10 seconds):          │   │
│  │  • Check active loans for expiration                      │   │
│  │  • Identify defaulted loans                               │   │
│  │  • Call backend API to trigger liquidation                │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Outputs:                                                        │
│  - GraphQL API (localhost:42069)                                 │
│  - PostgreSQL database with indexed data                         │
└─────────────────────────┬────────────────────────────────────────┘
                          │
                          │ (GraphQL + REST API)
                          ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND API (NestJS)                          │
│                                                                  │
│  ┌────────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────┐    │
│  │   Domain   │  │  Loans   │  │   Pools   │  │  Auctions   │    │
│  │  Scoring   │  │ Tracking │  │ Analytics │  │  Tracking   │    │
│  └────────────┘  └──────────┘  └───────────┘  └─────────────┘    │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐   │
│  │  Liquidation Service (Cron: every 10s):                   │   │
│  │  - Receives alerts from indexer                           │   │
│  │  - Executes LoanManager.liquidateCollateral()             │   │
│  │  - Monitors auction progress                              │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Database: PostgreSQL (prod) / SQLite (dev)                      │
│  API Docs: Swagger at /docs                                      │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow: Domain Scoring

```
User Request → AIOracle.paidScoreRequest()
                     │
                     ├─→ Transfer 1 USDC to AIOracle
                     ├─→ Emit PaidScoringRequested event
                     ├─→ Call ServiceManager.createDomainScoringTask()
                     │
                     ▼
          ServiceManager emits DomainScoringTaskCreated
                     │
                     ▼
          AVS Operator detects event (10s polling)
                     │
                     ├─→ Resolve domain name from tokenId
                     ├─→ Build AI prompt (7-tier scoring system)
                     ├─→ Call zkFetch (chosen AI model + ZK proof)
                     ├─→ Parse HTTP response (JSON extraction)
                     ├─→ Validate score (0-100) and confidence
                     ├─→ Upload to IPFS (full analysis + zkProof)
                     │
                     ▼
          Operator.respondToDomainTask()
                     │
                     ├─→ Submit score + IPFS hash + signature
                     ├─→ ServiceManager verifies task hash
                     ├─→ Store domain score data on-chain
                     ├─→ Call AIOracle.submitPaidScore()
                     │
                     ▼
          Score available for loan creation (24h validity)
```

### Data Flow: Loan Lifecycle

```
1. LOAN CREATION
   User → SatoruLending.createLoan()
            ├─→ Check domain score validity (AIOracle)
            ├─→ Validate LTV ratio (e.g., 45% for Tier 3)
            ├─→ Verify pool liquidity
            ├─→ Call LoanManager.createLoan()
            │       ├─→ Transfer domain NFT to escrow
            │       ├─→ Transfer loan amount to borrower
            │       ├─→ Record loan terms (amount, duration, interest)
            │       └─→ Emit LoanCreated event
            └─→ Indexer captures event → Update GraphQL API

2. REPAYMENT (Happy Path)
   User → LoanManager.repayLoan()
            ├─→ Transfer loan amount + interest
            ├─→ Release domain NFT to borrower
            ├─→ Distribute interest to pool lenders (pro-rata)
            ├─→ Emit LoanRepaid event
            └─→ Indexer updates loan status

3. DEFAULT (Unhappy Path)
   Indexer cron (every 10s) detects:
            ├─→ Loan deadline passed
            ├─→ No repayment transaction
            ├─→ Call backend API: /liquidation/trigger
            │
   Backend → LoanManager.liquidateCollateral()
            ├─→ Mark loan as defaulted
            ├─→ Call DutchAuction.startAuction()
            │       ├─→ Set start price (2x loan amount)
            │       ├─→ Set reserve price (0.5x loan amount)
            │       ├─→ Set duration (24 hours)
            │       └─→ Emit AuctionStarted event
            │
   Bidder → DutchAuction.placeBid()
            ├─→ Calculate current price (linear decay)
            ├─→ Validate bid amount ≥ current price
            ├─→ End auction immediately
            ├─→ Transfer domain NFT to bidder
            ├─→ Distribute proceeds to pool lenders
            ├─→ Emit AuctionEnded event
            └─→ Indexer updates auction status
```

---

## 🛠️ Technology Stack

| Layer               | Technology                           | Why It Matters                                                 |
| ------------------- | ------------------------------------ | -------------------------------------------------------------- |
| **Blockchain**      | Doma Protocol (ChainID: 97476)       | EVM-compatible L2 with fast finality                           |
| **Smart Contracts** | Solidity 0.8.20, Foundry, OpenZeppelin | Industry-standard security, 80 tests                           |
| **Upgradability**   | UUPS Proxy Pattern                   | Production-ready with stable addresses                         |
| **AVS Layer**       | EigenLayer Middleware                | Economic security via staking/slashing                         |
| **ZK Proofs**       | Reclaim Protocol (Zero-Knowledge TLS) | Cryptographically verified AI responses                        |
| **AI Models**       | OpenAI, Anthropic, Google, Local LLMs | Operator freedom—no vendor lock-in                             |
| **Indexing**        | Ponder v0.12, Viem v2                | Real-time blockchain data (10s latency)                        |
| **Backend**         | NestJS 10, TypeORM, ethers.js v6     | Enterprise-grade API with Swagger docs                         |
| **Frontend**        | Next.js 14, RainbowKit 2.2, Wagmi v2 | Modern Web3 UX with multi-wallet support                       |
| **Storage**         | IPFS (Pinata)                        | Decentralized, immutable score storage                         |

> **Innovation Highlight:** DomaLend is the first protocol to combine multi-agent AI scoring with EigenLayer AVS validation for trustless, consensus-driven domain valuations.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm 8+
- Foundry (for smart contracts)
- PostgreSQL 14+ (for production)
- Doma testnet RPC access
- OpenAI API key (for operators)

### 1. Clone Repository

```bash
git clone https://github.com/mfahriferdiansyah/domalend.git
cd domalend
```

### 2. Smart Contracts Setup

```bash
cd contractsV2
forge install
forge build
forge test # Run 80 tests to verify

# Deploy to Doma testnet
forge script script/Deploy.s.sol --rpc-url https://rpc-testnet.doma.xyz --broadcast --private-key YOUR_KEY
```

### 3. Backend Setup

```bash
cd backend
npm install

# Configure environment
cp .env.example .env
# Edit .env with your RPC URL, contract addresses, OpenAI API key

# Run migrations
npm run migration:run

# Start development server
npm run start:dev

# API available at http://localhost:3001
# Swagger docs at http://localhost:3001/docs
```

### 4. Indexer Setup

```bash
cd indexer
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with contract addresses and deployment block

# Generate types from ABIs
pnpm codegen

# Start indexer
pnpm dev

# GraphQL API at http://localhost:42069
```

### 5. AVS Operator Setup

```bash
cd avs
npm install

# Configure environment
cp .env.example .env
# Set USE_ZKFETCH=true, OPENAI_API_KEY, PRIVATE_KEY, contract addresses

# Start operator
npm run start:operator

# Operator will poll for DomainScoringTaskCreated events every 10s
```

### 6. Frontend Setup

```bash
cd frontend
pnpm install

# Configure environment
cp .env.example .env.local
# Set NEXT_PUBLIC_* variables for contract addresses

# Start development server
pnpm dev

# Open http://localhost:3000
```

---

## 📍 Deployed Contracts (Doma Testnet)

| Contract                  | Address                                      | Explorer                                                                                     |
| ------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **AIOracle (Proxy)**      | `0x7Db5ebf2cf03A926F66651D5D693E36A329628bB` | [View](https://explorer-testnet.doma.xyz/address/0x7Db5ebf2cf03A926F66651D5D693E36A329628bB) |
| **SatoruLending (Proxy)** | `0xfe94eE06009e078159cC3218285D391804002593` | [View](https://explorer-testnet.doma.xyz/address/0xfe94eE06009e078159cC3218285D391804002593) |
| **LoanManager (Proxy)**   | `0x1aD8cc20B99DCb5c86e0ad6549283ffA58f05ba8` | [View](https://explorer-testnet.doma.xyz/address/0x1aD8cc20B99DCb5c86e0ad6549283ffA58f05ba8) |
| **DutchAuction (Proxy)**  | `0xBb6a724BA12CD2d92002084c678500BF895F24AA` | [View](https://explorer-testnet.doma.xyz/address/0xBb6a724BA12CD2d92002084c678500BF895F24AA) |
| **ServiceManager (AVS)**  | `0x97D9188D93d23737bf96f2B894726da3173C726a` | [View](https://explorer-testnet.doma.xyz/address/0x97D9188D93d23737bf96f2B894726da3173C726a) |

---

## 📊 Domain Scoring Tiers

DomaLend uses a **7-tier classification system** for domain valuation:

| Tier                           | Score Range | Examples                     | LTV Ratio | Description                                  |
| ------------------------------ | ----------- | ---------------------------- | --------- | -------------------------------------------- |
| 🏆 **TIER 1: LEGENDARY**       | 95-100      | apple.com, google.com        | 70-75%    | Fortune 500 brands, global mega-corporations |
| 🚀 **TIER 2: PREMIUM**         | 80-94       | one.com, kick.com, shop.com  | 60-70%    | Ultra-short domains, perfect generic terms   |
| 💼 **TIER 3: QUALITY**         | 60-79       | golfclub.com, restaurant.com | 45-60%    | Clear business intent, good brandability     |
| ⭐ **TIER 4: AVERAGE**         | 40-59       | techblog.net, myshop.org     | 30-45%    | Readable, some commercial potential          |
| 📉 **TIER 5: MEDIOCRE**        | 20-39       | longdomainname.com           | 20-30%    | Poor brandability, limited appeal            |
| ❌ **TIER 6: BARELY READABLE** | 10-19       | randomwordscombined.net      | 15-25%    | Very low commercial value                    |
| 🗑️ **TIER 7: GARBAGE**         | 0-9         | aowkoaskdajsd.com            | 10-15%    | Gibberish, zero brand value                  |

**Scoring Factors:**

- Brand recognition and commercial potential
- Market comparables and historical sales
- Memorability and marketing appeal
- Business development potential
- Industry relevance

---

## 🔒 Security Features

### 1. Smart Contract Security

- OpenZeppelin audited libraries
- ReentrancyGuard on all state-changing functions
- Ownable access control
- Pausable emergency stops
- UUPS upgrade pattern with timelock (future)

### 2. Operator Security

- Zero-knowledge proofs for AI responses (zkFetch)
- IPFS immutable storage
- EigenLayer slashing for malicious behavior
- Multiple operators for consensus (future)

### 3. Liquidation Safety

- Automated monitoring (no manual intervention)
- Dutch auction prevents low-ball bids
- Reserve price protection for lenders
- Transparent on-chain settlement

### 4. API Security

- Rate limiting (Throttler)
- Helmet.js security headers
- Input validation (class-validator)
- CORS configuration

---

## 🗺️ Roadmap

### Phase 1: Core Protocol (COMPLETED ✅)

- [x] Smart contract development
- [x] AVS operator with zkFetch integration
- [x] Backend API and indexer
- [x] Frontend dApp
- [x] Doma testnet deployment

### Phase 2: Production Launch (Q1 2026)

- [ ] Mainnet deployment on Doma
- [ ] Multi-operator consensus for scoring
- [ ] EigenLayer staking and slashing implementation
- [ ] Security audit (CertiK/OpenZeppelin)
- [ ] Bug bounty program ($50K)

### Phase 3: Advanced Features (Q2 2026)

- [ ] Cross-chain support (Ethereum, Arbitrum, Base)
- [ ] NFT fractionalization for expensive domains
- [ ] Peer-to-pool lending (direct LP matching)
- [ ] Governance token (DOMA) and DAO
- [ ] Insurance fund for bad debt

### Phase 4: Ecosystem Expansion (Q3-Q4 2026)

- [ ] Domain marketplace integration
- [ ] Lease-to-own domain financing
- [ ] AI-powered domain generation
- [ ] Domain portfolio management tools
- [ ] Enterprise API for domain valuation

---

## 👥 Team

- **Smart Contract Lead** - Solidity expert, EigenLayer integration
- **Backend Developer** - NestJS, blockchain indexing
- **AVS Operator Specialist** - zkFetch, zero-knowledge proofs
- **Frontend Developer** - Next.js, Web3 UI/UX
- **Product Manager** - DeFi strategist, domain industry expert

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- **GitHub**: [github.com/mfahriferdiansyah/domalend](https://github.com/mfahriferdiansyah/domalend)
- **Doma Protocol**: [doma.xyz](https://doma.xyz)
- **Ponder Docs**: [ponder.sh](https://ponder.sh)
- **EigenLayer**: [docs.eigenlayer.xyz](https://docs.eigenlayer.xyz)
- **Reclaim Protocol**: [reclaimprotocol.org](https://reclaimprotocol.org)
- **Explorer**: [explorer-testnet.doma.xyz](https://explorer-testnet.doma.xyz)

---

## 📞 Support

- **GitHub Issues**: [Report bugs](https://github.com/mfahriferdiansyah/domalend/issues)
- **Email**: support@domalend.xyz
- **Discord**: [#support channel](https://discord.gg/domalend)

---

**Built with ❤️ by the DomaLend Team**

_Unlocking liquidity from digital assets, one domain at a time_ 🌐💰
