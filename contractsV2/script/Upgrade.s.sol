// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../src/AIOracleUpgradeable.sol";
import "../src/SatoruLendingUpgradeable.sol";
import "../src/LoanManagerUpgradeable.sol";
import "../src/DutchAuctionUpgradeable.sol";

/**
 * @title Upgrade DomaLend Contracts
 * @notice Upgrades all UUPS proxies to new implementations
 * @dev Tests that upgrade mechanism works by deploying new impls and calling upgradeTo()
 *
 * Required Environment Variables:
 * - PRIVATE_KEY: Owner private key
 * - AIORACLE_PROXY: AIOracle proxy address
 * - SATORU_PROXY: SatoruLending proxy address
 * - LOANMANAGER_PROXY: LoanManager proxy address
 * - DUTCHAUCTION_PROXY: DutchAuction proxy address
 * - SERVICE_MANAGER_ADDRESS (optional): AVS ServiceManager address to set in AIOracle
 *
 * Usage:
 * PRIVATE_KEY=0x... forge script script/Upgrade.s.sol:UpgradeScript \
 *   --rpc-url https://rpc-testnet.doma.xyz \
 *   --broadcast \
 *   --legacy
 */
contract UpgradeScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address aiOracleProxy = vm.envAddress("AIORACLE_PROXY");
        address satoruProxy = vm.envAddress("SATORU_PROXY");
        address loanManagerProxy = vm.envAddress("LOANMANAGER_PROXY");
        address dutchAuctionProxy = vm.envAddress("DUTCHAUCTION_PROXY");

        console.log("========================================");
        console.log("DomaLend UUPS Upgrade");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("");

        // Skip version check - old implementations don't have getVersion()
        console.log("Upgrading to v4.0.0...");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new implementations
        console.log("Deploying new implementations...");
        console.log("");

        AIOracleUpgradeable newAIOracle = new AIOracleUpgradeable();
        console.log("  AIOracle:     ", address(newAIOracle));

        SatoruLendingUpgradeable newSatoru = new SatoruLendingUpgradeable();
        console.log("  SatoruLending:", address(newSatoru));

        LoanManagerUpgradeable newLoanManager = new LoanManagerUpgradeable();
        console.log("  LoanManager:  ", address(newLoanManager));

        DutchAuctionUpgradeable newAuction = new DutchAuctionUpgradeable();
        console.log("  DutchAuction: ", address(newAuction));
        console.log("");

        // Upgrade all proxies
        console.log("Upgrading proxies...");
        console.log("");

        UUPSUpgradeable(aiOracleProxy).upgradeToAndCall(address(newAIOracle), "");
        console.log("  AIOracle upgraded!");

        UUPSUpgradeable(satoruProxy).upgradeToAndCall(address(newSatoru), "");
        console.log("  SatoruLending upgraded!");

        UUPSUpgradeable(loanManagerProxy).upgradeToAndCall(address(newLoanManager), "");
        console.log("  LoanManager upgraded!");

        UUPSUpgradeable(dutchAuctionProxy).upgradeToAndCall(address(newAuction), "");
        console.log("  DutchAuction upgraded!");
        console.log("");

        // Set ServiceManager address in AIOracle if provided
        address serviceManagerAddress = address(0);
        try vm.envAddress("SERVICE_MANAGER_ADDRESS") returns (address sm) {
            serviceManagerAddress = sm;
        } catch {
            // Not set, skip
        }

        if (serviceManagerAddress != address(0)) {
            console.log("Configuring ServiceManager in AIOracle (atomic)...");
            console.log("  This will:");
            console.log("  1. Grant SERVICE_MANAGER_ROLE (allows submitPaidScore)");
            console.log("  2. Set serviceManagerAddress (enables task creation)");
            AIOracleUpgradeable(aiOracleProxy).configureServiceManager(serviceManagerAddress);
            console.log("  ServiceManager configured:", serviceManagerAddress);
            console.log("");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("Verifying new versions...");
        console.log("");

        // Check new versions
        string memory aiVersion = AIOracleUpgradeable(aiOracleProxy).getVersion();
        string memory satoruVersion = SatoruLendingUpgradeable(satoruProxy).getVersion();
        string memory loanVersion = LoanManagerUpgradeable(loanManagerProxy).getVersion();
        string memory auctionVersion = DutchAuctionUpgradeable(dutchAuctionProxy).getVersion();

        console.log("  AIOracle:     ", aiVersion);
        console.log("  SatoruLending:", satoruVersion);
        console.log("  LoanManager:  ", loanVersion);
        console.log("  DutchAuction: ", auctionVersion);
        console.log("");

        console.log("========================================");
        console.log("UPGRADE COMPLETE!");
        console.log("========================================");
        console.log("");
        console.log("Proxy addresses (unchanged):");
        console.log("  AIOracle:     ", aiOracleProxy);
        console.log("  SatoruLending:", satoruProxy);
        console.log("  LoanManager:  ", loanManagerProxy);
        console.log("  DutchAuction: ", dutchAuctionProxy);
        console.log("");
        console.log("New implementation addresses:");
        console.log("  AIOracle:     ", address(newAIOracle));
        console.log("  SatoruLending:", address(newSatoru));
        console.log("  LoanManager:  ", address(newLoanManager));
        console.log("  DutchAuction: ", address(newAuction));
        console.log("");
        console.log("State preserved, logic upgraded!");
        console.log("========================================");
    }
}
