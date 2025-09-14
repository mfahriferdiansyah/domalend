// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/AIOracle.sol";
import "../src/SatoruLending.sol";
import "../src/LoanManager.sol";
import "../src/DutchAuction.sol";

contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Configuration
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address domaAddress = vm.envAddress("DOMA_ADDRESS");

        console.log("Deploying DomaLend V2 contracts...");
        console.log("Deployer:", deployer);
        console.log("USDC Address:", usdcAddress);
        console.log("Doma Address:", domaAddress);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AIOracle
        console.log("\n1. Deploying AIOracle...");
        AIOracle aiOracle = new AIOracle(deployer);
        console.log("AIOracle deployed at:", address(aiOracle));

        // 2. Deploy SatoruLending
        console.log("\n2. Deploying SatoruLending...");
        SatoruLending satoruLending = new SatoruLending(
            deployer,
            usdcAddress,
            domaAddress,
            address(aiOracle)
        );
        console.log("SatoruLending deployed at:", address(satoruLending));

        // 3. Deploy LoanManager
        console.log("\n3. Deploying LoanManager...");
        LoanManager loanManager = new LoanManager(
            deployer,
            usdcAddress,
            domaAddress,
            address(satoruLending)
        );
        console.log("LoanManager deployed at:", address(loanManager));

        // 4. Deploy DutchAuction
        console.log("\n4. Deploying DutchAuction...");
        DutchAuction dutchAuction = new DutchAuction(
            usdcAddress,
            domaAddress,
            address(loanManager),
            address(aiOracle),
            deployer
        );
        console.log("DutchAuction deployed at:", address(dutchAuction));

        // 5. Configure contract connections
        console.log("\n5. Configuring contract connections...");

        // Set LoanManager address in SatoruLending
        satoruLending.setLoanManager(address(loanManager));
        console.log("SatoruLending connected to LoanManager");

        // Set DutchAuction address in LoanManager
        loanManager.setDutchAuction(address(dutchAuction));
        console.log("LoanManager connected to DutchAuction");

        // Set deployer as authorized backend for AIOracle (for testing)
        aiOracle.setBackendService(deployer);
        console.log("AIOracle backend service set to deployer");

        vm.stopBroadcast();

        // 6. Summary
        console.log("\nDomaLend V2 deployment complete!");
        console.log("=====================================");
        console.log("AIOracle:      ", address(aiOracle));
        console.log("SatoruLending: ", address(satoruLending));
        console.log("LoanManager:   ", address(loanManager));
        console.log("DutchAuction:  ", address(dutchAuction));
        console.log("=====================================");

        // Verification commands (Blockscout)
        console.log("\nVerification commands (Blockscout):");
        console.log("forge verify-contract --rpc-url https://rpc-testnet.doma.xyz --verifier blockscout --verifier-url 'https://explorer-testnet.doma.xyz/api/'", address(aiOracle), "src/AIOracle.sol:AIOracle");
        console.log("forge verify-contract --rpc-url https://rpc-testnet.doma.xyz --verifier blockscout --verifier-url 'https://explorer-testnet.doma.xyz/api/'", address(satoruLending), "src/SatoruLending.sol:SatoruLending");
        console.log("forge verify-contract --rpc-url https://rpc-testnet.doma.xyz --verifier blockscout --verifier-url 'https://explorer-testnet.doma.xyz/api/'", address(loanManager), "src/LoanManager.sol:LoanManager");
        console.log("forge verify-contract --rpc-url https://rpc-testnet.doma.xyz --verifier blockscout --verifier-url 'https://explorer-testnet.doma.xyz/api/'", address(dutchAuction), "src/DutchAuction.sol:DutchAuction");
    }
}