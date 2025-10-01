# 🚀 DomaLend V2 Upgradeable - Deployment Summary

**Network**: Doma Testnet
**Chain ID**: 97476
**Deployer**: `0xaBA3cF48A81225De43a642ca486C1c069ec11a53`
**Date**: 2025-10-01
**Status**: ✅ **SUCCESSFULLY DEPLOYED**

---

## 📋 Deployed Contracts

### ProxyAdmin (Upgrade Controller)
**Address**: `0x7fd271d089d5cd01AFEE648F8CD25bEc94cce9C9`
**Owner**: `0xaBA3cF48A81225De43a642ca486C1c069ec11a53`
**Purpose**: Controls all contract upgrades - ONLY this address can upgrade implementations

**Explorer**: https://explorer-testnet.doma.xyz/address/0x7fd271d089d5cd01AFEE648F8CD25bEc94cce9C9

---

## 🎯 USE THESE ADDRESSES (Proxies)

### 1. AIOracle
**Proxy (USE THIS)**: `0xFF3803da2E2F3Ec8485E855e09898b548b506188`
**Implementation**: `0xB5fB366A7973d90ba27033eddb9EA24231f748C9`

**Explorer**:
- Proxy: https://explorer-testnet.doma.xyz/address/0xFF3803da2E2F3Ec8485E855e09898b548b506188
- Implementation: https://explorer-testnet.doma.xyz/address/0xB5fB366A7973d90ba27033eddb9EA24231f748C9

**Functions**:
- `submitScore(uint256 domainTokenId, uint256 score)` - Backend submits AI scores
- `scoreDomain(uint256 domainTokenId)` - Get domain score
- `hasValidScore(uint256 domainTokenId)` - Check if score exists

### 2. SatoruLending
**Proxy (USE THIS)**: `0xD5695a0700552c1FA747cc029a60cdB27373CE26`
**Implementation**: `0xE1685368816C97E5Fc4B3C72423FC08A6AE91642`

**Explorer**:
- Proxy: https://explorer-testnet.doma.xyz/address/0xD5695a0700552c1FA747cc029a60cdB27373CE26
- Implementation: https://explorer-testnet.doma.xyz/address/0xE1685368816C97E5Fc4B3C72423FC08A6AE91642

**Functions**:
- `createLiquidityPool(...)` - Create lending pool
- `addLiquidity(uint256 poolId, uint256 amount)` - Add USDC to pool
- `requestInstantLoan(...)` - Get instant loan from pool
- `createLoanRequest(...)` - Create crowdfunded loan request
- `fundLoanRequest(uint256 requestId, uint256 amount)` - Fund a loan request

### 3. LoanManager
**Proxy (USE THIS)**: `0x45D8F12329890Cd325FE05601F8E451d0b6B9D42`
**Implementation**: `0xE22699af9a79A7F6aa7885688b5122A9A84b68bC`

**Explorer**:
- Proxy: https://explorer-testnet.doma.xyz/address/0x45D8F12329890Cd325FE05601F8E451d0b6B9D42
- Implementation: https://explorer-testnet.doma.xyz/address/0xE22699af9a79A7F6aa7885688b5122A9A84b68bC

**Functions**:
- `repayLoan(uint256 loanId, uint256 amount)` - Repay loan
- `liquidateCollateral(uint256 loanId)` - Liquidate defaulted loan
- `releaseCollateral(uint256 loanId)` - Release collateral after repayment
- `isLoanDefaulted(uint256 loanId)` - Check if loan is defaulted

### 4. DutchAuction
**Proxy (USE THIS)**: `0xe6e20d2d356565614BCb6150350c1dfC9F653f36`
**Implementation**: `0x5Aa12B7D1FD19AA59962386717786248A6DAaEeD`

**Explorer**:
- Proxy: https://explorer-testnet.doma.xyz/address/0xe6e20d2d356565614BCb6150350c1dfC9F653f36
- Implementation: https://explorer-testnet.doma.xyz/address/0x5Aa12B7D1FD19AA59962386717786248A6DAaEeD

**Functions**:
- `placeBid(uint256 auctionId, uint256 bidAmount)` - Bid on auction
- `getCurrentPrice(uint256 auctionId)` - Get current auction price
- `getActiveAuctions()` - List all active auctions
- `endAuction(uint256 auctionId)` - End expired auction

---

## 🔗 Contract Connections

```
SatoruLending ──► LoanManager ──► DutchAuction
       │                │
       ▼                ▼
   AIOracle         AIOracle
```

**Verified Connections**:
✅ SatoruLending → LoanManager connected
✅ LoanManager → DutchAuction connected
✅ AIOracle backend service set to deployer

---

## 📊 Dependencies

| Contract | Address |
|----------|---------|
| **USDC** | `0x08CF67303E6ba2B80f5AFdE7ad926653145c6a7B` |
| **Doma Protocol NFT** | `0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f` |

---

## 🎮 Quick Test Commands

### Check Deployment
```bash
# Check AIOracle owner
cast call 0xFF3803da2E2F3Ec8485E855e09898b548b506188 "owner()" --rpc-url https://rpc-testnet.doma.xyz

# Check SatoruLending nextPoolId
cast call 0xD5695a0700552c1FA747cc029a60cdB27373CE26 "nextPoolId()" --rpc-url https://rpc-testnet.doma.xyz

# Check LoanManager nextLoanId
cast call 0x45D8F12329890Cd325FE05601F8E451d0b6B9D42 "nextLoanId()" --rpc-url https://rpc-testnet.doma.xyz
```

### Submit AI Score (as backend)
```bash
source .env
cast send 0xFF3803da2E2F3Ec8485E855e09898b548b506188 \
  "submitScore(uint256,uint256)" \
  1 75 \
  --rpc-url https://rpc-testnet.doma.xyz \
  --private-key $PRIVATE_KEY
```

### Create Liquidity Pool
```bash
source .env

# First approve USDC
cast send 0x08CF67303E6ba2B80f5AFdE7ad926653145c6a7B \
  "approve(address,uint256)" \
  0xD5695a0700552c1FA747cc029a60cdB27373CE26 \
  1000000000 \
  --rpc-url https://rpc-testnet.doma.xyz \
  --private-key $PRIVATE_KEY

# Then create pool (see docs/CAST_COMMANDS.md for full params)
```

---

## 🔐 Security Notes

### Important
- **ProxyAdmin owner** (`0xaBA3cF48A81225De43a642ca486C1c069ec11a53`) can upgrade ALL contracts
- Consider transferring to **multisig** for production
- Keep private key secure - it controls $XXM in upgradeable contracts

### Upgrade Capability
```bash
# To upgrade any contract (requires ProxyAdmin owner key)
CONTRACT_NAME=SatoruLending \
PROXY_ADMIN_ADDRESS=0x7fd271d089d5cd01AFEE648F8CD25bEc94cce9C9 \
SATORU_LENDING_PROXY_ADDRESS=0xD5695a0700552c1FA747cc029a60cdB27373CE26 \
forge script script/Upgrade.s.sol:UpgradeScript --rpc-url https://rpc-testnet.doma.xyz --broadcast
```

---

## 📝 Contract Verification

**Status**: ⚠️ **Pending Blockscout Indexing**

Blockscout needs time to index the contracts. Retry verification in 5-10 minutes:

```bash
# AIOracle Implementation
forge verify-contract \
  0xB5fB366A7973d90ba27033eddb9EA24231f748C9 \
  src/AIOracleUpgradeable.sol:AIOracleUpgradeable \
  --rpc-url https://rpc-testnet.doma.xyz \
  --verifier blockscout \
  --verifier-url https://explorer-testnet.doma.xyz/api/

# SatoruLending Implementation
forge verify-contract \
  0xE1685368816C97E5Fc4B3C72423FC08A6AE91642 \
  src/SatoruLendingUpgradeable.sol:SatoruLendingUpgradeable \
  --rpc-url https://rpc-testnet.doma.xyz \
  --verifier blockscout \
  --verifier-url https://explorer-testnet.doma.xyz/api/

# LoanManager Implementation
forge verify-contract \
  0xE22699af9a79A7F6aa7885688b5122A9A84b68bC \
  src/LoanManagerUpgradeable.sol:LoanManagerUpgradeable \
  --rpc-url https://rpc-testnet.doma.xyz \
  --verifier blockscout \
  --verifier-url https://explorer-testnet.doma.xyz/api/

# DutchAuction Implementation
forge verify-contract \
  0x5Aa12B7D1FD19AA59962386717786248A6DAaEeD \
  src/DutchAuctionUpgradeable.sol:DutchAuctionUpgradeable \
  --rpc-url https://rpc-testnet.doma.xyz \
  --verifier blockscout \
  --verifier-url https://explorer-testnet.doma.xyz/api/
```

---

## 📚 Next Steps

1. ✅ **Test each contract** using commands above
2. ⏳ **Wait for Blockscout indexing** (5-10 min) then verify
3. 🔄 **Update frontend** with new proxy addresses
4. 🔄 **Update indexer** (Ponder) to listen to proxy addresses
5. 🧪 **Run end-to-end tests** on testnet
6. 🎯 **Create test pool, loan, and auction** to verify full flow

---

## 🎯 Summary

✅ **13 contracts deployed** (4 implementations + 4 proxies + 1 ProxyAdmin + 4 proxy admins)
✅ **All connections configured**
✅ **Initialization successful**
✅ **Gas used**: ~10M total
✅ **Ready for testing**

**Total Deployment Cost**: ~0.124 ETH (balance remaining)

---

## 📞 Support Files

- **Deployment config**: `deployment-upgradeable.json`
- **Deployment log**: `deployment-log.txt`
- **User guide**: `docs/UPGRADEABLE.md`
- **Upgrade guide**: `docs/UPGRADE_VERIFICATION.md`
- **Change summary**: `docs/CHANGES_SUMMARY.md`
