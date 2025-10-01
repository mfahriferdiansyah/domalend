# Quick Reference - DomaLend V2

## 🔥 CRITICAL ADDRESSES (Copy-Paste Ready)

```bash
# Proxy Addresses (USE THESE)
export AIORACLE_ADDRESS="0xFF3803da2E2F3Ec8485E855e09898b548b506188"
export SATORU_ADDRESS="0xD5695a0700552c1FA747cc029a60cdB27373CE26"
export LOANMANAGER_ADDRESS="0x45D8F12329890Cd325FE05601F8E451d0b6B9D42"
export DUTCHAUCTION_ADDRESS="0xe6e20d2d356565614BCb6150350c1dfC9F653f36"
export PROXYADMIN_ADDRESS="0x7fd271d089d5cd01AFEE648F8CD25bEc94cce9C9"

# Dependencies
export USDC_ADDRESS="0x08CF67303E6ba2B80f5AFdE7ad926653145c6a7B"
export DOMA_ADDRESS="0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f"

# Network
export RPC_URL="https://rpc-testnet.doma.xyz"
export CHAIN_ID="97476"

# Keys
export DEPLOYER_KEY="0x5ebacdeab953a523c54bc1de3ff4b4d92a2e966e16dd760ac5d8900059e38a70"
export LENDER1_KEY="0x84879ffe9f0b582b956f4870f8b12b0481095a8f19383e0744f0ef293f7f89f4"
export LENDER2_KEY="0xfc5125e9fdc8963c11b341c5d76b9c0aeb90758aa9dbe1e9b8c506581bcaf490"

# Test Domain
export TEST_DOMAIN="54344964066288468101530659531467425324551312134658892013131579195659464473615"
```

## 🎯 ONE-COMMAND DEPLOY

```bash
PRIVATE_KEY=0x5ebacdeab953a523c54bc1de3ff4b4d92a2e966e16dd760ac5d8900059e38a70 \
forge script script/DeployUpgradeable.s.sol:DeployUpgradeableScript \
  --rpc-url https://rpc-testnet.doma.xyz \
  --broadcast \
  --legacy
```

## 🔧 ONE-COMMAND UPGRADE

```bash
# Edit src/AIOracleUpgradeable.sol first, then:
PRIVATE_KEY=0x5ebacdeab953a523c54bc1de3ff4b4d92a2e966e16dd760ac5d8900059e38a70 \
CONTRACT_NAME=AIOracle \
forge script script/Upgrade.s.sol:UpgradeScript \
  --rpc-url https://rpc-testnet.doma.xyz \
  --broadcast \
  --legacy
```

## 📝 STRUCTURE (What to Edit)

```
✅ EDIT THESE:
src/AIOracleUpgradeable.sol
src/SatoruLendingUpgradeable.sol
src/LoanManagerUpgradeable.sol
src/DutchAuctionUpgradeable.sol

📦 DON'T TOUCH:
src/legacy/*
```

## ⚡ VERIFIED TEST FLOW

All working on testnet (2025-10-01):
- ✅ Pool creation (10k USDC)
- ✅ AI scoring (score 85)
- ✅ Instant loan (2 USDC, 60s)
- ✅ Loan repayment
- ✅ Short loan (1 USDC, 30s)
- ✅ Liquidation
- ✅ Dutch auction
- ✅ Auction bid & win

## 🚨 REMEMBER

1. Always use `--legacy` flag on cast send
2. Approve LoanManager (not just SatoruLending) for domains
3. Don't create V2/V3 files - edit originals
4. Storage gap = 50 slots reserved
5. Never reorder storage variables

## 📚 Full Docs

- DEPLOYMENT_INFO.md - All addresses & details
- UPGRADE_GUIDE.md - How to upgrade
- CAST_COMMANDS.md - Command examples
- DEPLOYMENT_SUMMARY.md - Deployment log
