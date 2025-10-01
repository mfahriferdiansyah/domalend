# DomaLend V2 - Upgrade Guide

## ✅ Clean Structure - No V2, V3, V4 Files!

**The RIGHT way to upgrade**: Edit the existing contract files directly, then redeploy.

## 📁 Current Structure

```
src/
├── AIOracleUpgradeable.sol        ✅ ACTIVE - Edit this directly
├── SatoruLendingUpgradeable.sol   ✅ ACTIVE - Edit this directly
├── LoanManagerUpgradeable.sol     ✅ ACTIVE - Edit this directly
├── DutchAuctionUpgradeable.sol    ✅ ACTIVE - Edit this directly
├── interfaces/                     ✅ Shared interfaces
└── legacy/                         📦 Archive (don't touch)
    ├── AIOracle.sol               (original non-upgradeable)
    ├── SatoruLending.sol
    ├── LoanManager.sol
    └── DutchAuction.sol
```

## 🚀 How to Upgrade a Contract

### Example: Adding new function to AIOracle

**Step 1: Edit the contract directly**
```solidity
// Edit src/AIOracleUpgradeable.sol

function newFeature() external onlyRole(DEFAULT_ADMIN_ROLE) {
    // Your new feature code
}
```

**Step 2: Deploy new implementation**
```bash
# The proxy address stays the same!
forge script script/Upgrade.s.sol:UpgradeScript \
  --rpc-url https://rpc-testnet.doma.xyz \
  --broadcast \
  --legacy
```

**Step 3: Done!**
- All state preserved ✅
- Same proxy address ✅
- New functions available ✅

## 🎯 Deployed Addresses (USE THESE)

**Proxies** (never change):
- AIOracle: `0xFF3803da2E2F3Ec8485E855e09898b548b506188`
- SatoruLending: `0xD5695a0700552c1FA747cc029a60cdB27373CE26`
- LoanManager: `0x45D8F12329890Cd325FE05601F8E451d0b6B9D42`
- DutchAuction: `0xe6e20d2d356565614BCb6150350c1dfC9F653f36`

**ProxyAdmin**: `0x7fd271d089d5cd01AFEE648F8CD25bEc94cce9C9`

## ❌ WRONG Way (Don't Do This!)

```bash
# ❌ Creating separate version files
src/AIOracleUpgradeableV2.sol
src/AIOracleUpgradeableV3.sol
src/AIOracleUpgradeableV4.sol

# This is messy and unnecessary!
```

## ✅ RIGHT Way

```bash
# ✅ Just edit the original file
src/AIOracleUpgradeable.sol  (edit this)
src/AIOracleUpgradeable.sol  (edit again)
src/AIOracleUpgradeable.sol  (keep editing)

# Deploy new implementation each time
forge script script/Upgrade.s.sol --broadcast
```

## 🔐 Storage Safety Rules

1. **Never reorder existing storage variables**
2. **Never change variable types**
3. **Only add NEW variables at the END**
4. **Storage gap reserves space** (`uint256[50] private __gap`)

### Example - Safe Changes:

```solidity
contract AIOracleUpgradeable {
    // ✅ EXISTING - Don't touch order/type
    address public backendService;
    bool public emergencyPaused;
    mapping(uint256 => DomainScore) public domainScores;

    // ✅ NEW - Add at end
    uint256 public newFeatureTimestamp;  // Safe to add
    mapping(address => bool) public premiumUsers;  // Safe to add

    // ✅ Storage gap (automatically manages space)
    uint256[50] private __gap;
}
```

### Example - UNSAFE Changes:

```solidity
contract AIOracleUpgradeable {
    // ❌ WRONG - Reordered variables
    bool public emergencyPaused;      // Was 2nd, now 1st
    address public backendService;     // Was 1st, now 2nd

    // ❌ WRONG - Changed type
    uint256 public emergencyPaused;    // Was bool

    // ❌ WRONG - Inserted in middle
    address public backendService;
    uint256 public newVar;             // Inserted here!
    bool public emergencyPaused;
}
```

## 📝 Upgrade Checklist

Before upgrading:
- [ ] Only added new storage at the end
- [ ] Didn't change existing variable types
- [ ] Didn't reorder variables
- [ ] Tested on testnet first
- [ ] Verified state preservation

## 🛠️ Testing Upgrades

```bash
# 1. Check current state
cast call 0xFF3803da2E2F3Ec8485E855e09898b548b506188 \
  "totalScoresSubmitted()" \
  --rpc-url https://rpc-testnet.doma.xyz

# 2. Upgrade
forge script script/Upgrade.s.sol --broadcast

# 3. Verify state preserved
cast call 0xFF3803da2E2F3Ec8485E855e09898b548b506188 \
  "totalScoresSubmitted()" \
  --rpc-url https://rpc-testnet.doma.xyz

# 4. Test new function
cast send 0xFF3803da2E2F3Ec8485E855e09898b548b506188 \
  "newFeature()" \
  --private-key $PRIVATE_KEY
```

## 🎓 Why This Approach?

**Upgradeable contracts work by:**
1. Proxy stores all data (state)
2. Implementation has all logic (code)
3. Proxy delegates calls to implementation
4. Change implementation → code changes, data stays

**That's why you don't need V2/V3 files:**
- Edit the contract
- Deploy new implementation
- Update proxy pointer
- Done!

## 📚 More Info

- OpenZeppelin Proxy Docs: https://docs.openzeppelin.com/upgrades-plugins
- Storage Layout: https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html
- Upgrade Patterns: https://blog.openzeppelin.com/the-transparent-proxy-pattern
