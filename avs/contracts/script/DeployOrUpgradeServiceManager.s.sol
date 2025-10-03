// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {DomalendServiceManagerUpgradable} from "../src/DomalendServiceManagerUpgradable.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";

/**
 * @title Deploy or Upgrade DomalendServiceManager
 * @notice Smart deployment that checks if ServiceManager exists and either deploys or upgrades
 * @dev Handles both initial deployment and upgrade scenarios
 *
 * Required Environment Variables:
 * - PRIVATE_KEY: Deployer private key
 * - AVS_DIRECTORY: EigenLayer AVS Directory address
 * - STAKE_REGISTRY: ECDSAStakeRegistry address
 * - REWARDS_COORDINATOR: EigenLayer RewardsCoordinator address
 * - DELEGATION_MANAGER: EigenLayer DelegationManager address
 * - AI_ORACLE_ADDRESS: AIOracleUpgradeable proxy address
 * - SERVICE_MANAGER_PROXY (optional): Existing ServiceManager proxy address (for upgrade)
 *
 * Usage for initial deployment:
 * forge script script/DeployOrUpgradeServiceManager.s.sol:DeployOrUpgradeServiceManager \
 *   --rpc-url https://rpc-testnet.doma.xyz \
 *   --broadcast \
 *   --legacy
 *
 * Usage for upgrade (set SERVICE_MANAGER_PROXY):
 * SERVICE_MANAGER_PROXY=0x... forge script script/DeployOrUpgradeServiceManager.s.sol:DeployOrUpgradeServiceManager \
 *   --rpc-url https://rpc-testnet.doma.xyz \
 *   --broadcast \
 *   --legacy
 */
contract DeployOrUpgradeServiceManager is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // EigenLayer addresses
        address avsDirectory = vm.envAddress("AVS_DIRECTORY");
        address stakeRegistry = vm.envAddress("STAKE_REGISTRY");
        address rewardsCoordinator = vm.envAddress("REWARDS_COORDINATOR");
        address delegationManager = vm.envAddress("DELEGATION_MANAGER");

        // AIOracle address
        address aiOracleAddress = vm.envAddress("AI_ORACLE_ADDRESS");

        // Rewards initiator (can be deployer initially)
        address rewardsInitiator = deployer;
        try vm.envAddress("REWARDS_INITIATOR") returns (address r) {
            rewardsInitiator = r;
        } catch {
            // Use deployer as default
        }

        // Check if SERVICE_MANAGER_PROXY exists
        address existingProxy = address(0);
        try vm.envAddress("SERVICE_MANAGER_PROXY") returns (address proxy) {
            existingProxy = proxy;
        } catch {
            // Not set, will deploy fresh
        }

        bool isUpgrade = existingProxy != address(0) && existingProxy.code.length > 0;

        console2.log("========================================");
        if (isUpgrade) {
            console2.log("DomalendServiceManager UPGRADE");
        } else {
            console2.log("DomalendServiceManager INITIAL DEPLOYMENT");
        }
        console2.log("========================================");
        console2.log("Deployer:           ", deployer);
        console2.log("AVS Directory:      ", avsDirectory);
        console2.log("Stake Registry:     ", stakeRegistry);
        console2.log("Rewards Coordinator:", rewardsCoordinator);
        console2.log("Delegation Manager: ", delegationManager);
        console2.log("AI Oracle:          ", aiOracleAddress);
        console2.log("Rewards Initiator:  ", rewardsInitiator);
        if (isUpgrade) {
            console2.log("Existing Proxy:     ", existingProxy);
        }
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new implementation
        console2.log("Deploying new implementation...");
        DomalendServiceManagerUpgradable implementation = new DomalendServiceManagerUpgradable(
            avsDirectory,
            stakeRegistry,
            rewardsCoordinator,
            delegationManager
        );
        console2.log("Implementation:     ", address(implementation));
        console2.log("");

        address proxyAddress;

        if (isUpgrade) {
            // UPGRADE EXISTING PROXY
            console2.log("Upgrading existing proxy...");

            DomalendServiceManagerUpgradable proxy = DomalendServiceManagerUpgradable(existingProxy);

            // Get current version
            string memory oldVersion = "unknown";
            try proxy.getVersion() returns (string memory v) {
                oldVersion = v;
            } catch {}

            // Upgrade to new implementation
            proxy.upgradeToAndCall(address(implementation), "");

            console2.log("Upgrade complete!");
            console2.log("Old version: ", oldVersion);
            console2.log("New version: ", proxy.getVersion());

            proxyAddress = existingProxy;
        } else {
            // INITIAL DEPLOYMENT WITH PROXY
            console2.log("Deploying proxy and initializing...");

            // Prepare initialization data with ALL parameters
            bytes memory initData = abi.encodeWithSelector(
                DomalendServiceManagerUpgradable.initialize.selector,
                deployer,           // initialOwner
                rewardsInitiator,   // _rewardsInitiator
                aiOracleAddress     // _aiOracleAddress
            );

            // Deploy ERC1967 proxy
            ERC1967Proxy proxy = new ERC1967Proxy(
                address(implementation),
                initData
            );

            proxyAddress = address(proxy);

            console2.log("Proxy deployed:     ", proxyAddress);
            console2.log("Initialized with:");
            console2.log("  Owner:            ", deployer);
            console2.log("  Rewards Initiator:", rewardsInitiator);
            console2.log("  AI Oracle:        ", aiOracleAddress);
            console2.log("");

            DomalendServiceManagerUpgradable serviceManager = DomalendServiceManagerUpgradable(proxyAddress);
            console2.log("Version:            ", serviceManager.getVersion());
            console2.log("Owner (verify):     ", serviceManager.owner());
            console2.log("Rewards Initiator:  ", serviceManager.rewardsInitiator());
        }

        vm.stopBroadcast();

        console2.log("");
        console2.log("========================================");
        console2.log("DEPLOYMENT COMPLETE!");
        console2.log("========================================");
        console2.log("");
        console2.log("ServiceManager Proxy:", proxyAddress);
        console2.log("Implementation:      ", address(implementation));
        console2.log("");
        console2.log("IMPORTANT: Update your .env with:");
        console2.log("SERVICE_MANAGER_ADDRESS=", proxyAddress);
        console2.log("");
        console2.log("Next steps:");
        console2.log("1. Verify owner is set correctly:");
        console2.log("   ServiceManager.owner() =", DomalendServiceManagerUpgradable(proxyAddress).owner());
        console2.log("");
        console2.log("2. Set ServiceManager address in AIOracle:");
        console2.log("   AIOracle.setServiceManagerAddress(", proxyAddress, ")");
        console2.log("");
        console2.log("3. Grant SERVICE_MANAGER_ROLE to ServiceManager:");
        console2.log("   AIOracle.registerServiceManager(", proxyAddress, ")");
        console2.log("========================================");
    }
}
