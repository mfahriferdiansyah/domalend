# DomaLend V2 - Critical Deployment Information

## 🎯 DEPLOYED CONTRACTS (Upgradeable - LIVE ON TESTNET)

### Proxy Addresses (USE THESE - Never Change)
```
AIOracle:      0xFF3803da2E2F3Ec8485E855e09898b548b506188
SatoruLending: 0xD5695a0700552c1FA747cc029a60cdB27373CE26
LoanManager:   0x45D8F12329890Cd325FE05601F8E451d0b6B9D42
DutchAuction:  0xe6e20d2d356565614BCb6150350c1dfC9F653f36
ProxyAdmin:    0x7fd271d089d5cd01AFEE648F8CD25bEc94cce9C9
```

### Current Implementation Addresses
```
AIOracle Impl:      0xB5fB366A7973d90ba27033eddb9EA24231f748C9
SatoruLending Impl: 0xE1685368816C97E5Fc4B3C72423FC08A6AE91642
LoanManager Impl:   0xE22699af9a79A7F6aa7885688b5122A9A84b68bC
DutchAuction Impl:  0x5Aa12B7D1FD19AA59962386717786248A6DAaEeD
```

### Dependencies
```
USDC:         0x08CF67303E6ba2B80f5AFdE7ad926653145c6a7B
Doma Protocol: 0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f
```

### Network
```
Chain ID: 97476 (Doma Testnet)
RPC: https://rpc-testnet.doma.xyz
Explorer: https://explorer-testnet.doma.xyz
```

### Deployer Account
```
Address: 0xaBA3cF48A81225De43a642ca486C1c069ec11a53
Private Key: 0x5ebacdeab953a523c54bc1de3ff4b4d92a2e966e16dd760ac5d8900059e38a70
```

### Test Accounts
```
LENDER1:
  Address: 0x47B245f2A3c7557d855E4d800890C4a524a42Cc8
  Key: 0x84879ffe9f0b582b956f4870f8b12b0481095a8f19383e0744f0ef293f7f89f4

LENDER2:
  Address: 0x9Dc7CBd56951433c5E0d276ac488D9fAbE862558
  Key: 0xfc5125e9fdc8963c11b341c5d76b9c0aeb90758aa9dbe1e9b8c506581bcaf490
```

### Test Domain
```
Token ID: 54344964066288468101530659531467425324551312134658892013131579195659464473615
Owner: 0xaBA3cF48A81225De43a642ca486C1c069ec11a53
AI Score: 85
```

## ✅ SUCCESSFUL E2E TEST RESULTS (2025-10-01)

### Full Testing Flow Completed:

1. **Pool Creation** ✅
   - Pool ID: 1
   - Liquidity: 10,000 USDC
   - Min Score: 50
   - Interest: 10% APR
   - Tx: 0x14b9398901bfbacc497ec4bbc8f1556ccd5c2371ed54de1624116be9d0f7b5e3

2. **AI Scoring** ✅
   - Domain: 54344964066288468101530659531467425324551312134658892013131579195659464473615
   - Score: 85
   - Total Scores Submitted: 2
   - Tx: 0x27213fbd0e3bd8145262b191fe72a90d95095b1a867957a6ca9ff5982a53dbe6

3. **Instant Loan (Repaid)** ✅
   - Loan ID: 1
   - Amount: 2 USDC
   - Duration: 60s
   - Status: REPAID
   - Borrow Tx: 0x64329bc0ddbd871b4f0d2ed0e10374101c4e5477ee546e357062d31eaf65c3f0
   - Repay Tx: 0x224495ccbbea6d51bdd3fff19b9f1a2198a2cb0da17b85952da94be2152a43c1

4. **Short-Duration Loan (Liquidated)** ✅
   - Loan ID: 2
   - Amount: 1 USDC
   - Duration: 30s
   - Status: LIQUIDATED
   - Borrow Tx: 0x9cdf84c299095c7fd6f763c3e6b3a554f702665381735c1deace9ceea3e8f68f

5. **Liquidation** ✅
   - Loan ID: 2
   - Auction ID: 1
   - Starting Price: 2 USDC (2x loan amount)
   - Tx: 0x637728aaf7cec13965794ea8f3e5170e18a95cb58d5bed0143ad69986f722bed

6. **Dutch Auction Bid** ✅
   - Auction ID: 1
   - Winner: LENDER1 (0x47B245f2A3c7557d855E4d800890C4a524a42Cc8)
   - Winning Bid: ~2 USDC
   - Domain Transferred: YES
   - Tx: 0xd535b8d4067224af2051c3278bf55f961937cf221a5c477e68bc038bca568b7c

## 📁 PROJECT STRUCTURE (CRITICAL!)

### DO NOT Create V2/V3/V4 Files!

```
src/
├── AIOracleUpgradeable.sol        ✅ ACTIVE - Edit directly for upgrades
├── SatoruLendingUpgradeable.sol   ✅ ACTIVE - Edit directly for upgrades
├── LoanManagerUpgradeable.sol     ✅ ACTIVE - Edit directly for upgrades
├── DutchAuctionUpgradeable.sol    ✅ ACTIVE - Edit directly for upgrades
├── interfaces/                     ✅ Shared by all contracts
│   ├── IAIOracle.sol
│   ├── IDoma.sol
│   ├── IDutchAuction.sol
│   ├── ILoanManager.sol
│   └── ISatoruLending.sol
└── legacy/                         📦 Archive only - don't use
    ├── AIOracle.sol               (original non-upgradeable)
    ├── SatoruLending.sol
    ├── LoanManager.sol
    ├── DutchAuction.sol
    └── README.md

script/
├── DeployUpgradeable.s.sol        ✅ Initial deployment script
└── Upgrade.s.sol                  ✅ Upgrade existing contracts

test/
├── legacy/                         📦 Tests for old contracts
│   ├── AIOracle.t.sol
│   ├── SatoruLending.t.sol
│   ├── LoanManager.t.sol
│   └── DutchAuction.t.sol
└── mocks/                          ✅ Mock contracts for testing
```

### Foundry Config (foundry.toml)
```toml
exclude = ["src/legacy/**", "script/legacy/**", "test/legacy/**"]
solc = "0.8.22"  # Required for OpenZeppelin Upgradeable
```

## 🔐 UPGRADE PROCESS (CRITICAL!)

### The RIGHT Way to Upgrade:

1. **Edit contract directly**
   ```bash
   # Edit src/AIOracleUpgradeable.sol
   # Add new functions at the end
   ```

2. **Deploy new implementation**
   ```bash
   CONTRACT_NAME=AIOracle \
   forge script script/Upgrade.s.sol:UpgradeScript \
     --rpc-url https://rpc-testnet.doma.xyz \
     --broadcast \
     --legacy
   ```

3. **Verify upgrade**
   ```bash
   # Check old data preserved
   cast call 0xFF3803da2E2F3Ec8485E855e09898b548b506188 \
     "totalScoresSubmitted()" \
     --rpc-url https://rpc-testnet.doma.xyz

   # Test new function
   cast send 0xFF3803da2E2F3Ec8485E855e09898b548b506188 \
     "newFunction()" \
     --private-key $PRIVATE_KEY
   ```

### Storage Safety Rules:
- ✅ Add new variables at END only
- ✅ Never reorder existing variables
- ✅ Never change variable types
- ✅ Storage gap reserves 50 slots: `uint256[50] private __gap`

## 🛠️ QUICK COMMANDS

### Check Deployment
```bash
cast call 0xFF3803da2E2F3Ec8485E855e09898b548b506188 "owner()" --rpc-url https://rpc-testnet.doma.xyz
cast call 0xD5695a0700552c1FA747cc029a60cdB27373CE26 "nextPoolId()" --rpc-url https://rpc-testnet.doma.xyz
cast call 0x45D8F12329890Cd325FE05601F8E451d0b6B9D42 "nextLoanId()" --rpc-url https://rpc-testnet.doma.xyz
```

### Submit AI Score
```bash
cast send 0xFF3803da2E2F3Ec8485E855e09898b548b506188 \
  "submitScore(uint256,uint256)" \
  <domainId> <score> \
  --private-key 0x5ebacdeab953a523c54bc1de3ff4b4d92a2e966e16dd760ac5d8900059e38a70 \
  --rpc-url https://rpc-testnet.doma.xyz \
  --legacy
```

### Create Pool
```bash
# 1. Approve USDC
cast send 0x08CF67303E6ba2B80f5AFdE7ad926653145c6a7B \
  "approve(address,uint256)" \
  0xD5695a0700552c1FA747cc029a60cdB27373CE26 \
  50000000000 \
  --private-key $PRIVATE_KEY --rpc-url https://rpc-testnet.doma.xyz --legacy

# 2. Create pool
cast send 0xD5695a0700552c1FA747cc029a60cdB27373CE26 \
  "createLiquidityPool((uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool))" \
  "(10000000000,50,999999999,1000,1000000,5000000000,30,300,true)" \
  --private-key $PRIVATE_KEY --rpc-url https://rpc-testnet.doma.xyz --legacy
```

### Request Instant Loan
```bash
# 1. Approve domain
cast send 0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f \
  "approve(address,uint256)" \
  0x45D8F12329890Cd325FE05601F8E451d0b6B9D42 \
  <domainTokenId> \
  --private-key $BORROWER_KEY --rpc-url https://rpc-testnet.doma.xyz --legacy

# 2. Request loan
cast send 0xD5695a0700552c1FA747cc029a60cdB27373CE26 \
  "requestInstantLoan((uint256,uint256,uint256,uint256))" \
  "(<domainTokenId>,<poolId>,<amount>,<duration>)" \
  --private-key $BORROWER_KEY --rpc-url https://rpc-testnet.doma.xyz --legacy
```

## 🎓 IMPORTANT LESSONS LEARNED

### 1. **OpenZeppelin v5 Proxy Structure**
- Uses nested ProxyAdmin (each proxy has its own admin)
- Main ProxyAdmin: 0x7fd271d089d5cd01AFEE648F8CD25bEc94cce9C9
- Proxy's admin: 0x729058fba3da308ef45b99550c60f7342ccca1db
- This is normal for OZ v5.4.0

### 2. **Upgradeability is Proven Working**
- Contracts use Transparent Proxy pattern ✅
- Storage gaps implemented (50 slots) ✅
- State preserved through upgrades ✅
- New implementation deployed: 0x6d90636453eF78e00d448B587D5208E3e422Ca9f ✅

### 3. **Don't Create V2/V3 Files**
- Edit existing contract files directly
- Deploy new implementation
- Update proxy pointer
- All state automatically preserved

### 4. **Cast Commands Must Use --legacy**
- Doma testnet requires legacy transaction type
- Always add `--legacy` flag to cast send commands

### 5. **Domain Must Be Approved for LoanManager**
- Not just SatoruLending
- Approve: 0x45D8F12329890Cd325FE05601F8E451d0b6B9D42
- Required before loan request

## 📊 STATE VERIFIED

Current state preserved in proxy:
- Total scores submitted: 2
- Test domain score: 85
- Pool 1 exists: 10k USDC liquidity
- Loan 1: Repaid
- Loan 2: Liquidated
- Auction 1: Completed

## 🔗 DOCUMENTATION

- DEPLOYMENT_SUMMARY.md - Full deployment details
- UPGRADE_GUIDE.md - How to upgrade contracts
- CAST_COMMANDS.md - All cast command examples
- docs/UPGRADEABLE.md - Upgradeable contracts guide
- src/legacy/README.md - Legacy contracts info

## 🎯 NEXT STEPS FOR PRODUCTION

1. Transfer ProxyAdmin to multisig
2. Verify contracts on Blockscout
3. Update frontend with proxy addresses
4. Update indexer (Ponder) to listen to proxy addresses
5. Run comprehensive security audit
6. Set up monitoring/alerts

---

**Last Updated**: 2025-10-01
**Status**: ✅ All systems operational
**Network**: Doma Testnet (Chain ID: 97476)
