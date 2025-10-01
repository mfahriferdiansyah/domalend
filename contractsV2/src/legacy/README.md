# Legacy Contracts (Non-Upgradeable)

This folder contains the original non-upgradeable versions of the DomaLend contracts.

## ⚠️ DEPRECATED - DO NOT USE

These contracts are kept for reference only. They were replaced with upgradeable versions using OpenZeppelin's Transparent Proxy pattern.

## Files

- `AIOracle.sol` - Original domain scoring oracle
- `SatoruLending.sol` - Original lending pool contract
- `LoanManager.sol` - Original loan lifecycle manager
- `DutchAuction.sol` - Original liquidation auction contract

## Current Active Contracts

All active contracts are now in `/src/` with the `Upgradeable` suffix:

- `AIOracleUpgradeable.sol` ✅ Active
- `SatoruLendingUpgradeable.sol` ✅ Active
- `LoanManagerUpgradeable.sol` ✅ Active
- `DutchAuctionUpgradeable.sol` ✅ Active

## Deployed Addresses (Upgradeable)

**Proxies (USE THESE)**:
- AIOracle: `0xFF3803da2E2F3Ec8485E855e09898b548b506188`
- SatoruLending: `0xD5695a0700552c1FA747cc029a60cdB27373CE26`
- LoanManager: `0x45D8F12329890Cd325FE05601F8E451d0b6B9D42`
- DutchAuction: `0xe6e20d2d356565614BCb6150350c1dfC9F653f36`

**ProxyAdmin**: `0x7fd271d089d5cd01AFEE648F8CD25bEc94cce9C9`

## Making Changes

**DO NOT create V2, V3, etc. files!**

When you need to upgrade:
1. Edit the upgradeable contract directly in `/src/`
2. Deploy new implementation: `forge script script/DeployNewImplementation.s.sol`
3. Upgrade proxy to point to new implementation
4. All state is preserved automatically

Example:
```solidity
// Just edit AIOracleUpgradeable.sol directly
function newFeature() external {
    // Your new code
}
```

Then deploy and upgrade - that's it!
