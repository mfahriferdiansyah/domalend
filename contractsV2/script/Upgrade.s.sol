// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "../src/AIOracleUpgradeable.sol";
import "../src/SatoruLendingUpgradeable.sol";
import "../src/LoanManagerUpgradeable.sol";
import "../src/DutchAuctionUpgradeable.sol";

/**
 * @title Upgrade Script for DomaLend V2
 * @notice This script upgrades implementation contracts while preserving state
 * @dev IMPORTANT: This uses the Transparent Proxy pattern
 *
 * Usage Examples:
 * ===============
 *
 * 1. Upgrade AIOracle:
 *    CONTRACT_NAME=AIOracle forge script script/Upgrade.s.sol:UpgradeScript --rpc-url $RPC_URL --broadcast
 *
 * 2. Upgrade SatoruLending:
 *    CONTRACT_NAME=SatoruLending forge script script/Upgrade.s.sol:UpgradeScript --rpc-url $RPC_URL --broadcast
 *
 * 3. Upgrade LoanManager:
 *    CONTRACT_NAME=LoanManager forge script script/Upgrade.s.sol:UpgradeScript --rpc-url $RPC_URL --broadcast
 *
 * 4. Upgrade DutchAuction:
 *    CONTRACT_NAME=DutchAuction forge script script/Upgrade.s.sol:UpgradeScript --rpc-url $RPC_URL --broadcast
 *
 * Required Environment Variables:
 * ===============================
 * - PRIVATE_KEY: Deployer private key (must be ProxyAdmin owner)
 * - CONTRACT_NAME: Name of contract to upgrade (AIOracle, SatoruLending, LoanManager, or DutchAuction)
 * - PROXY_ADMIN_ADDRESS: Address of the ProxyAdmin contract
 * - [CONTRACT]_PROXY_ADDRESS: Address of the proxy to upgrade
 */
contract UpgradeScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Get environment variables
        string memory contractName = vm.envString("CONTRACT_NAME");
        address proxyAdminAddress = vm.envAddress("PROXY_ADMIN_ADDRESS");

        console.log("========================================");
        console.log("DomaLend V2 Upgrade Script");
        console.log("========================================");
        console.log("Upgrader:", deployer);
        console.log("ProxyAdmin:", proxyAdminAddress);
        console.log("Contract to upgrade:", contractName);
        console.log("");

        ProxyAdmin proxyAdmin = ProxyAdmin(proxyAdminAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new implementation based on contract name
        if (keccak256(bytes(contractName)) == keccak256(bytes("AIOracle"))) {
            upgradeAIOracle(proxyAdmin);
        } else if (keccak256(bytes(contractName)) == keccak256(bytes("SatoruLending"))) {
            upgradeSatoruLending(proxyAdmin);
        } else if (keccak256(bytes(contractName)) == keccak256(bytes("LoanManager"))) {
            upgradeLoanManager(proxyAdmin);
        } else if (keccak256(bytes(contractName)) == keccak256(bytes("DutchAuction"))) {
            upgradeDutchAuction(proxyAdmin);
        } else {
            revert("Invalid CONTRACT_NAME. Must be: AIOracle, SatoruLending, LoanManager, or DutchAuction");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("========================================");
        console.log("UPGRADE COMPLETE");
        console.log("========================================");
    }

    function upgradeAIOracle(ProxyAdmin proxyAdmin) internal {
        address proxyAddress = vm.envAddress("AIORACLE_PROXY_ADDRESS");

        console.log("Upgrading AIOracle...");
        console.log("  Proxy address:", proxyAddress);

        // Deploy new implementation
        AIOracleUpgradeable newImpl = new AIOracleUpgradeable();
        console.log("  New implementation:", address(newImpl));

        // Upgrade to new implementation
        proxyAdmin.upgradeAndCall(
            ITransparentUpgradeableProxy(proxyAddress),
            address(newImpl),
            "" // No initialization data for upgrades
        );

        console.log("  Upgrade successful!");
        console.log("  New implementation address:", address(newImpl));
    }

    function upgradeSatoruLending(ProxyAdmin proxyAdmin) internal {
        address proxyAddress = vm.envAddress("SATORU_LENDING_PROXY_ADDRESS");

        console.log("Upgrading SatoruLending...");
        console.log("  Proxy address:", proxyAddress);

        SatoruLendingUpgradeable newImpl = new SatoruLendingUpgradeable();
        console.log("  New implementation:", address(newImpl));

        proxyAdmin.upgradeAndCall(
            ITransparentUpgradeableProxy(proxyAddress),
            address(newImpl),
            ""
        );

        console.log("  Upgrade successful!");
        console.log("  New implementation address:", address(newImpl));
    }

    function upgradeLoanManager(ProxyAdmin proxyAdmin) internal {
        address proxyAddress = vm.envAddress("LOAN_MANAGER_PROXY_ADDRESS");

        console.log("Upgrading LoanManager...");
        console.log("  Proxy address:", proxyAddress);

        LoanManagerUpgradeable newImpl = new LoanManagerUpgradeable();
        console.log("  New implementation:", address(newImpl));

        proxyAdmin.upgradeAndCall(
            ITransparentUpgradeableProxy(proxyAddress),
            address(newImpl),
            ""
        );

        console.log("  Upgrade successful!");
        console.log("  New implementation address:", address(newImpl));
    }

    function upgradeDutchAuction(ProxyAdmin proxyAdmin) internal {
        address proxyAddress = vm.envAddress("DUTCH_AUCTION_PROXY_ADDRESS");

        console.log("Upgrading DutchAuction...");
        console.log("  Proxy address:", proxyAddress);

        DutchAuctionUpgradeable newImpl = new DutchAuctionUpgradeable();
        console.log("  New implementation:", address(newImpl));

        proxyAdmin.upgradeAndCall(
            ITransparentUpgradeableProxy(proxyAddress),
            address(newImpl),
            ""
        );

        console.log("  Upgrade successful!");
        console.log("  New implementation address:", address(newImpl));
    }
}
