// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin-upgrades/contracts/proxy/utils/UUPSUpgradeable.sol";
import "../src/DomalendServiceManagerUpgradable.sol";

/**
 * @title Upgrade DomaLend ServiceManager
 * @notice Upgrades ServiceManager UUPS proxy to v2.2.1 (removes onlyOperator check)
 *
 * Required Environment Variables:
 * - PRIVATE_KEY: Owner private key
 * - SERVICE_MANAGER_PROXY: ServiceManager proxy address
 *
 * Usage:
 * forge script script/UpgradeServiceManager.s.sol:UpgradeServiceManagerScript \
 *   --rpc-url https://rpc-testnet.doma.xyz \
 *   --broadcast \
 *   --legacy
 */
contract UpgradeServiceManagerScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address serviceManagerProxy = vm.envAddress("SERVICE_MANAGER_PROXY");

        // Load constructor args from environment
        address avsDirectory = vm.envAddress("AVS_DIRECTORY");
        address stakeRegistry = vm.envAddress("STAKE_REGISTRY");
        address rewardsCoordinator = vm.envAddress("REWARDS_COORDINATOR");
        address delegationManager = vm.envAddress("DELEGATION_MANAGER");

        console.log("========================================");
        console.log("ServiceManager UUPS Upgrade to v2.2.1");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("Proxy:", serviceManagerProxy);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new implementation with constructor args
        console.log("Deploying new ServiceManager implementation...");
        DomalendServiceManagerUpgradable newImpl = new DomalendServiceManagerUpgradable(
            avsDirectory,
            stakeRegistry,
            rewardsCoordinator,
            delegationManager
        );
        console.log("  New Implementation:", address(newImpl));
        console.log("");

        // Upgrade proxy
        console.log("Upgrading proxy...");
        UUPSUpgradeable(serviceManagerProxy).upgradeToAndCall(address(newImpl), "");
        console.log("  ServiceManager upgraded!");
        console.log("");

        vm.stopBroadcast();

        // Verify version
        console.log("Verifying new version...");
        string memory version = DomalendServiceManagerUpgradable(serviceManagerProxy).getVersion();
        console.log("  Version:", version);
        console.log("");

        console.log("========================================");
        console.log("UPGRADE COMPLETE!");
        console.log("========================================");
        console.log("");
        console.log("Changes in v2.2.1:");
        console.log("  - Removed onlyOperator modifier from respondToDomainTask()");
        console.log("  - Operators can now respond without ECDSAStakeRegistry registration");
        console.log("");
        console.log("Proxy address (unchanged):", serviceManagerProxy);
        console.log("New implementation:", address(newImpl));
        console.log("========================================");
    }
}
