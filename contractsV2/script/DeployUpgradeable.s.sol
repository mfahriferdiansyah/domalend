// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "../src/AIOracleUpgradeable.sol";
import "../src/SatoruLendingUpgradeable.sol";
import "../src/LoanManagerUpgradeable.sol";
import "../src/DutchAuctionUpgradeable.sol";

contract DeployUpgradeableScript is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        // Configuration
        address usdcAddress = vm.envAddress("USDC_ADDRESS");
        address domaAddress = vm.envAddress("DOMA_ADDRESS");

        console.log("========================================");
        console.log("Deploying DomaLend V2 Upgradeable Contracts");
        console.log("========================================");
        console.log("Deployer:", deployer);
        console.log("USDC Address:", usdcAddress);
        console.log("Doma Address:", domaAddress);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy ProxyAdmin (manages all proxies)
        console.log("1. Deploying ProxyAdmin...");
        ProxyAdmin proxyAdmin = new ProxyAdmin(deployer);
        console.log("   ProxyAdmin deployed at:", address(proxyAdmin));
        console.log("");

        // Step 2: Deploy AIOracle Implementation + Proxy
        console.log("2. Deploying AIOracle (Upgradeable)...");
        AIOracleUpgradeable aiOracleImpl = new AIOracleUpgradeable();
        console.log("   AIOracle Implementation:", address(aiOracleImpl));

        bytes memory aiOracleInitData = abi.encodeWithSelector(
            AIOracleUpgradeable.initialize.selector,
            deployer
        );

        TransparentUpgradeableProxy aiOracleProxy = new TransparentUpgradeableProxy(
            address(aiOracleImpl),
            address(proxyAdmin),
            aiOracleInitData
        );
        console.log("   AIOracle Proxy:", address(aiOracleProxy));
        console.log("");

        // Step 3: Deploy SatoruLending Implementation + Proxy
        console.log("3. Deploying SatoruLending (Upgradeable)...");
        SatoruLendingUpgradeable satoruLendingImpl = new SatoruLendingUpgradeable();
        console.log("   SatoruLending Implementation:", address(satoruLendingImpl));

        bytes memory satoruLendingInitData = abi.encodeWithSelector(
            SatoruLendingUpgradeable.initialize.selector,
            deployer,
            usdcAddress,
            domaAddress,
            address(aiOracleProxy)
        );

        TransparentUpgradeableProxy satoruLendingProxy = new TransparentUpgradeableProxy(
            address(satoruLendingImpl),
            address(proxyAdmin),
            satoruLendingInitData
        );
        console.log("   SatoruLending Proxy:", address(satoruLendingProxy));
        console.log("");

        // Step 4: Deploy LoanManager Implementation + Proxy
        console.log("4. Deploying LoanManager (Upgradeable)...");
        LoanManagerUpgradeable loanManagerImpl = new LoanManagerUpgradeable();
        console.log("   LoanManager Implementation:", address(loanManagerImpl));

        bytes memory loanManagerInitData = abi.encodeWithSelector(
            LoanManagerUpgradeable.initialize.selector,
            deployer,
            usdcAddress,
            domaAddress,
            address(satoruLendingProxy)
        );

        TransparentUpgradeableProxy loanManagerProxy = new TransparentUpgradeableProxy(
            address(loanManagerImpl),
            address(proxyAdmin),
            loanManagerInitData
        );
        console.log("   LoanManager Proxy:", address(loanManagerProxy));
        console.log("");

        // Step 5: Deploy DutchAuction Implementation + Proxy
        console.log("5. Deploying DutchAuction (Upgradeable)...");
        DutchAuctionUpgradeable dutchAuctionImpl = new DutchAuctionUpgradeable();
        console.log("   DutchAuction Implementation:", address(dutchAuctionImpl));

        bytes memory dutchAuctionInitData = abi.encodeWithSelector(
            DutchAuctionUpgradeable.initialize.selector,
            usdcAddress,
            domaAddress,
            address(loanManagerProxy),
            address(aiOracleProxy),
            deployer
        );

        TransparentUpgradeableProxy dutchAuctionProxy = new TransparentUpgradeableProxy(
            address(dutchAuctionImpl),
            address(proxyAdmin),
            dutchAuctionInitData
        );
        console.log("   DutchAuction Proxy:", address(dutchAuctionProxy));
        console.log("");

        // Step 6: Wire up contract connections
        console.log("6. Configuring contract connections...");

        // Set LoanManager in SatoruLending
        SatoruLendingUpgradeable satoruLending = SatoruLendingUpgradeable(address(satoruLendingProxy));
        satoruLending.setLoanManager(address(loanManagerProxy));
        console.log("   SatoruLending -> LoanManager connected");

        // Set DutchAuction in LoanManager
        LoanManagerUpgradeable loanManager = LoanManagerUpgradeable(address(loanManagerProxy));
        loanManager.setDutchAuction(address(dutchAuctionProxy));
        console.log("   LoanManager -> DutchAuction connected");

        // Set deployer as backend service for AIOracle
        AIOracleUpgradeable aiOracle = AIOracleUpgradeable(address(aiOracleProxy));
        aiOracle.setBackendService(deployer);
        console.log("   AIOracle backend service set");
        console.log("");

        vm.stopBroadcast();

        // Step 7: Print deployment summary
        console.log("========================================");
        console.log("DEPLOYMENT COMPLETE - UPGRADEABLE CONTRACTS");
        console.log("========================================");
        console.log("");
        console.log("ProxyAdmin:               ", address(proxyAdmin));
        console.log("");
        console.log("AIOracle:");
        console.log("  - Implementation:       ", address(aiOracleImpl));
        console.log("  - Proxy:                ", address(aiOracleProxy));
        console.log("");
        console.log("SatoruLending:");
        console.log("  - Implementation:       ", address(satoruLendingImpl));
        console.log("  - Proxy:                ", address(satoruLendingProxy));
        console.log("");
        console.log("LoanManager:");
        console.log("  - Implementation:       ", address(loanManagerImpl));
        console.log("  - Proxy:                ", address(loanManagerProxy));
        console.log("");
        console.log("DutchAuction:");
        console.log("  - Implementation:       ", address(dutchAuctionImpl));
        console.log("  - Proxy:                ", address(dutchAuctionProxy));
        console.log("");
        console.log("========================================");
        console.log("USAGE ADDRESSES (Use proxy addresses):");
        console.log("========================================");
        console.log("AIOracle:                 ", address(aiOracleProxy));
        console.log("SatoruLending:            ", address(satoruLendingProxy));
        console.log("LoanManager:              ", address(loanManagerProxy));
        console.log("DutchAuction:             ", address(dutchAuctionProxy));
        console.log("========================================");
        console.log("");
        console.log("NOTE: Always interact with PROXY addresses, not implementations!");
        console.log("ProxyAdmin controls all upgrades - only owner can upgrade");
        console.log("");

        // Save deployment info to JSON
        string memory deploymentJson = string(abi.encodePacked(
            '{\n',
            '  "proxyAdmin": "', vm.toString(address(proxyAdmin)), '",\n',
            '  "aiOracle": {\n',
            '    "implementation": "', vm.toString(address(aiOracleImpl)), '",\n',
            '    "proxy": "', vm.toString(address(aiOracleProxy)), '"\n',
            '  },\n',
            '  "satoruLending": {\n',
            '    "implementation": "', vm.toString(address(satoruLendingImpl)), '",\n',
            '    "proxy": "', vm.toString(address(satoruLendingProxy)), '"\n',
            '  },\n',
            '  "loanManager": {\n',
            '    "implementation": "', vm.toString(address(loanManagerImpl)), '",\n',
            '    "proxy": "', vm.toString(address(loanManagerProxy)), '"\n',
            '  },\n',
            '  "dutchAuction": {\n',
            '    "implementation": "', vm.toString(address(dutchAuctionImpl)), '",\n',
            '    "proxy": "', vm.toString(address(dutchAuctionProxy)), '"\n',
            '  }\n',
            '}'
        ));

        // File writing disabled for Foundry permissions
        // Deployment addresses logged above
    }
}
