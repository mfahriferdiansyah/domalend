// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DomaLend.sol";
import "../src/mocks/MockUSDC.sol";
import "../src/mocks/MockOracle.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy mock contracts for testing
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC deployed at:", address(usdc));
        
        // Use real Doma Protocol Ownership Token contract
        address domaProtocol = 0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f;
        console.log("Using real Doma Protocol at:", domaProtocol);
        
        MockOracle oracle = new MockOracle();
        console.log("MockOracle deployed at:", address(oracle));
        
        // Deploy main contract
        DomaLend domaLend = new DomaLend(
            address(usdc),
            domaProtocol,
            address(oracle)
        );
        console.log("DomaLend deployed at:", address(domaLend));
        
        // Mint some USDC for testing (optional)
        // This mints 1,000,000 USDC to the deployer
        usdc.mint(msg.sender, 1_000_000 * 1e6);
        console.log("Minted 1,000,000 USDC to deployer");
        
        vm.stopBroadcast();
        
        // Output deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("USDC (Mock):", address(usdc));
        console.log("Doma Protocol (Real):", domaProtocol);
        console.log("AI Oracle (Mock):", address(oracle));
        console.log("DomaLend:", address(domaLend));
        console.log("========================\n");
    }
}