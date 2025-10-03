# DomaLend Deployment & Upgrade Guide

## Overview

This guide covers deploying and upgrading DomaLend contracts with AVS integration for paid-only scoring.

## Architecture

```
AIOracleUpgradeable (contractsV2)
    ↓ calls createDomainScoringTask(tokenId, requestId)
DomalendServiceManagerUpgradable (avs/contracts)
    ↓ operators respond
    ↓ calls submitPaidScore(requestId, tokenId, score, operator)
AIOracleUpgradeable → pays operator
```

## Prerequisites

### Required Environment Variables

Create `.env` files in both directories:

**avs/contracts/.env:**
```bash
# Deployment
PRIVATE_KEY=your_private_key_here
DOMA_RPC_URL=https://rpc-testnet.doma.xyz

# EigenLayer Addresses (Doma Testnet)
AVS_DIRECTORY=0x...
STAKE_REGISTRY=0x...
REWARDS_COORDINATOR=0x...
DELEGATION_MANAGER=0x...

# DomaLend Addresses
AI_ORACLE_ADDRESS=0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1

# For upgrades (set after initial deployment)
SERVICE_MANAGER_PROXY=0x...
```

**contractsV2/.env:**
```bash
PRIVATE_KEY=your_private_key_here
DOMA_RPC_URL=https://rpc-testnet.doma.xyz

# Existing proxy addresses
AIORACLE_PROXY=0x43f0Ce9B2209D7F041525Af40f365a2B22DF53a1
SATORU_PROXY=0x76435A7eE4d2c1AB98D75e6b8927844aF1Fb2F2B
LOANMANAGER_PROXY=0x5365E0cf54Bccc157A0eFBb3aC77F826E27f9A49
DUTCHAUCTION_PROXY=0xF4eC2e259036A841D7ebd8A34fDC97311Be063d1

# Set after AVS deployment
SERVICE_MANAGER_ADDRESS=0x...
```

## Deployment Scenarios

### Scenario 1: Initial ServiceManager Deployment

**Step 1: Deploy ServiceManager**
```bash
cd avs/contracts

# Deploy fresh ServiceManager with UUPS proxy
forge script script/DeployOrUpgradeServiceManager.s.sol:DeployOrUpgradeServiceManager \
  --rpc-url $DOMA_RPC_URL \
  --broadcast \
  --legacy
```

**Output:**
```
ServiceManager Proxy: 0x...
Implementation:       0x...

IMPORTANT: Update your .env with:
SERVICE_MANAGER_ADDRESS=0x...
```

**Step 2: Update AIOracle to use ServiceManager**
```bash
cd ../../contractsV2

# Add SERVICE_MANAGER_ADDRESS to .env
echo "SERVICE_MANAGER_ADDRESS=0x..." >> .env

# Upgrade AIOracle and configure ServiceManager
forge script script/Upgrade.s.sol:UpgradeScript \
  --rpc-url $DOMA_RPC_URL \
  --broadcast \
  --legacy
```

This will:
1. Upgrade AIOracle with new `requestId` logic
2. Call `setServiceManagerAddress()`
3. Grant `SERVICE_MANAGER_ROLE` to ServiceManager

### Scenario 2: Upgrade Existing ServiceManager

If ServiceManager is already deployed, set `SERVICE_MANAGER_PROXY` in `.env`:

```bash
cd avs/contracts

# Set existing proxy address
echo "SERVICE_MANAGER_PROXY=0xYourExistingProxy" >> .env

# Run deployment script (will detect and upgrade)
forge script script/DeployOrUpgradeServiceManager.s.sol:DeployOrUpgradeServiceManager \
  --rpc-url $DOMA_RPC_URL \
  --broadcast \
  --legacy
```

**Output:**
```
DomalendServiceManager UPGRADE
Existing Proxy:     0x...
Upgrade complete!
Old version: 1.0.0
New version: 2.0.0
```

### Scenario 3: Upgrade AIOracle Only

If you only need to upgrade contractsV2 without changing ServiceManager:

```bash
cd contractsV2

# Ensure SERVICE_MANAGER_ADDRESS is set in .env
forge script script/Upgrade.s.sol:UpgradeScript \
  --rpc-url $DOMA_RPC_URL \
  --broadcast \
  --legacy
```

## Verification Checklist

After deployment/upgrade, verify the integration:

### 1. Check ServiceManager Configuration
```bash
# Read AIOracle address from ServiceManager
cast call $SERVICE_MANAGER_PROXY "aiOracleAddress()" --rpc-url $DOMA_RPC_URL

# Check version
cast call $SERVICE_MANAGER_PROXY "getVersion()" --rpc-url $DOMA_RPC_URL
# Should return: "2.0.0"
```

### 2. Check AIOracle Configuration
```bash
# Read ServiceManager address from AIOracle
cast call $AIORACLE_PROXY "serviceManagerAddress()" --rpc-url $DOMA_RPC_URL

# Check if ServiceManager has role
cast call $AIORACLE_PROXY "isServiceManager(address)" $SERVICE_MANAGER_PROXY --rpc-url $DOMA_RPC_URL
# Should return: true

# Check version
cast call $AIORACLE_PROXY "getVersion()" --rpc-url $DOMA_RPC_URL
# Should return: "4.1.0"
```

### 3. Test End-to-End Flow

**Test paid scoring:**
```bash
# 1. Request paid score (from user wallet)
cast send $AIORACLE_PROXY "paidScoreRequest(uint256)" $DOMAIN_TOKEN_ID \
  --rpc-url $DOMA_RPC_URL \
  --private-key $USER_PRIVATE_KEY

# 2. Check for DomainScoringTaskCreated event
cast logs --address $SERVICE_MANAGER_PROXY \
  --from-block latest \
  --rpc-url $DOMA_RPC_URL

# 3. Operator will detect and respond (check operator logs)
# 4. Verify score was submitted and operator was paid
cast call $AIORACLE_PROXY "getDomainScore(uint256)" $DOMAIN_TOKEN_ID \
  --rpc-url $DOMA_RPC_URL
```

## Rollback Procedure

If upgrade fails, rollback using UUPS:

```bash
# Get previous implementation address from deployment logs
PREVIOUS_IMPL=0x...

# Rollback ServiceManager
cast send $SERVICE_MANAGER_PROXY "upgradeToAndCall(address,bytes)" $PREVIOUS_IMPL 0x \
  --rpc-url $DOMA_RPC_URL \
  --private-key $PRIVATE_KEY

# Rollback AIOracle
cast send $AIORACLE_PROXY "upgradeToAndCall(address,bytes)" $PREVIOUS_IMPL 0x \
  --rpc-url $DOMA_RPC_URL \
  --private-key $PRIVATE_KEY
```

## Common Issues

### Issue: "Request not found" when operator submits

**Cause:** `requestId` mismatch between AIOracle and ServiceManager

**Solution:**
1. Check that both contracts are upgraded
2. Verify ServiceManager address is set in AIOracle
3. Check event logs to ensure `requestId` is being passed correctly

### Issue: "AIOracle paid submission failed"

**Cause:** ServiceManager doesn't have `SERVICE_MANAGER_ROLE`

**Solution:**
```bash
cast send $AIORACLE_PROXY "registerServiceManager(address)" $SERVICE_MANAGER_PROXY \
  --rpc-url $DOMA_RPC_URL \
  --private-key $PRIVATE_KEY
```

### Issue: Operator not getting paid

**Cause:** ServiceManager calling free `submitScore()` instead of `submitPaidScore()`

**Solution:** Verify ServiceManager is upgraded to v2.0.0 that calls `submitPaidScore()`

## Contract Versions

After successful deployment:

| Contract | Version | Key Changes |
|----------|---------|-------------|
| AIOracleUpgradeable | 4.1.0 | - Passes `requestId` to ServiceManager<br>- Removed AVS trigger from free requests |
| DomalendServiceManagerUpgradable | 2.0.0 | - Accepts `requestId` in tasks<br>- Calls `submitPaidScore()` with operator address |

## Support

For issues or questions:
- Check logs: `avs/operator/logs/`
- Review events on explorer: https://explorer-testnet.doma.xyz
- Verify contract versions using `getVersion()` calls
