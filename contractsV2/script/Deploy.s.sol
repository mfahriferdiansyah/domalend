// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../src/AIOracleUpgradeable.sol";
import "../src/SatoruLendingUpgradeable.sol";
import "../src/LoanManagerUpgradeable.sol";
import "../src/DutchAuctionUpgradeable.sol";

/**
 * @title DomaLend UUPS Deployment
 * @notice Deploys all contracts using UUPS pattern with ERC1967Proxy
 * @dev Single deployment script - no V2/V3 versioning needed
 *
 * Required Environment Variables:
 * - PRIVATE_KEY: Deployer private key
 * - USDC_ADDRESS: USDC token address
 * - DOMA_ADDRESS: Doma protocol address
 *
 * Usage:
 * PRIVATE_KEY=0x... forge script script/Deploy.s.sol:DeployScript \
 *   --rpc-url https://rpc-testnet.doma.xyz \
 *   --broadcast \
 *   --legacy
 */
contract DeployScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address domaAddress = vm.envAddress("DOMA_ADDRESS");

        console.log("========================================");
        console.log("DomaLend UUPS Deployment");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("USDC:", usdcAddress);
        console.log("Doma:", domaAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy AIOracle
        console.log("1. Deploying AIOracle...");
        AIOracleUpgradeable aiOracleImpl = new AIOracleUpgradeable();

        bytes memory aiOracleInitData = abi.encodeWithSelector(
            AIOracleUpgradeable.initialize.selector,
            deployer
        );

        ERC1967Proxy aiOracleProxy = new ERC1967Proxy(
            address(aiOracleImpl),
            aiOracleInitData
        );

        AIOracleUpgradeable aiOracle = AIOracleUpgradeable(address(aiOracleProxy));
        console.log("  Implementation:", address(aiOracleImpl));
        console.log("  Proxy:", address(aiOracleProxy));
        console.log("  Version:", aiOracle.getVersion());
        console.log("  Owner:", aiOracle.owner());
        console.log("");

        // Deploy SatoruLending
        console.log("2. Deploying SatoruLending...");
        SatoruLendingUpgradeable satoruImpl = new SatoruLendingUpgradeable();

        bytes memory satoruInitData = abi.encodeWithSelector(
            SatoruLendingUpgradeable.initialize.selector,
            deployer,
            usdcAddress,
            domaAddress,
            address(aiOracleProxy)
        );

        ERC1967Proxy satoruProxy = new ERC1967Proxy(
            address(satoruImpl),
            satoruInitData
        );

        SatoruLendingUpgradeable satoru = SatoruLendingUpgradeable(address(satoruProxy));
        console.log("  Implementation:", address(satoruImpl));
        console.log("  Proxy:", address(satoruProxy));
        console.log("  Version:", satoru.getVersion());
        console.log("  Owner:", satoru.owner());
        console.log("");

        // Deploy LoanManager
        console.log("3. Deploying LoanManager...");
        LoanManagerUpgradeable loanManagerImpl = new LoanManagerUpgradeable();

        bytes memory loanManagerInitData = abi.encodeWithSelector(
            LoanManagerUpgradeable.initialize.selector,
            deployer,
            usdcAddress,
            domaAddress,
            address(satoruProxy)
        );

        ERC1967Proxy loanManagerProxy = new ERC1967Proxy(
            address(loanManagerImpl),
            loanManagerInitData
        );

        LoanManagerUpgradeable loanManager = LoanManagerUpgradeable(address(loanManagerProxy));
        console.log("  Implementation:", address(loanManagerImpl));
        console.log("  Proxy:", address(loanManagerProxy));
        console.log("  Version:", loanManager.getVersion());
        console.log("  Owner:", loanManager.owner());
        console.log("");

        // Deploy DutchAuction
        console.log("4. Deploying DutchAuction...");
        DutchAuctionUpgradeable auctionImpl = new DutchAuctionUpgradeable();

        bytes memory auctionInitData = abi.encodeWithSelector(
            DutchAuctionUpgradeable.initialize.selector,
            usdcAddress,
            domaAddress,
            address(loanManagerProxy),
            address(aiOracleProxy),
            deployer
        );

        ERC1967Proxy auctionProxy = new ERC1967Proxy(
            address(auctionImpl),
            auctionInitData
        );

        DutchAuctionUpgradeable auction = DutchAuctionUpgradeable(address(auctionProxy));
        console.log("  Implementation:", address(auctionImpl));
        console.log("  Proxy:", address(auctionProxy));
        console.log("  Version:", auction.getVersion());
        console.log("  Owner:", auction.owner());
        console.log("");

        // Setup connections
        console.log("5. Setting up contract connections...");
        satoru.setLoanManager(address(loanManagerProxy));
        loanManager.setDutchAuction(address(auctionProxy));
        console.log("  Connections established!");
        console.log("");

        vm.stopBroadcast();

        // Summary
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE - V1.0.0");
        console.log("========================================");
        console.log("");
        console.log("Proxy Addresses (use these):");
        console.log("  AIOracle:     ", address(aiOracleProxy));
        console.log("  SatoruLending:", address(satoruProxy));
        console.log("  LoanManager:  ", address(loanManagerProxy));
        console.log("  DutchAuction: ", address(auctionProxy));
        console.log("");
        console.log("All contracts deployed with UUPS pattern");
        console.log("Owner can upgrade by calling upgradeTo(newImpl)");
        console.log("========================================");
    }
}
