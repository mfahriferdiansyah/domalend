// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DomalendServiceManagerUpgradable.sol";

/**
 * @title Deploy ServiceManager Implementation Only
 * @notice Deploys ONLY the new implementation without upgrading
 */
contract DeployImplementationOnly is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address avsDirectory = vm.envAddress("AVS_DIRECTORY");
        address stakeRegistry = vm.envAddress("STAKE_REGISTRY");
        address rewardsCoordinator = vm.envAddress("REWARDS_COORDINATOR");
        address delegationManager = vm.envAddress("DELEGATION_MANAGER");

        console.log("========================================");
        console.log("Deploy ServiceManager v2.2.1 Implementation");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        DomalendServiceManagerUpgradable impl = new DomalendServiceManagerUpgradable(
            avsDirectory,
            stakeRegistry,
            rewardsCoordinator,
            delegationManager
        );

        console.log("Implementation deployed:", address(impl));
        console.log("Version:", impl.getVersion());

        vm.stopBroadcast();

        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("========================================");
        console.log("");
        console.log("Next step: Upgrade proxy to this implementation:");
        console.log("cast send", vm.envAddress("SERVICE_MANAGER_PROXY"));
        console.log('  "upgradeTo(address)" ', address(impl));
        console.log("  --rpc-url https://rpc-testnet.doma.xyz");
        console.log("  --private-key $PRIVATE_KEY --legacy");
    }
}
