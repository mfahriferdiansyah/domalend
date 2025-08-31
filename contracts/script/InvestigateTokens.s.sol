// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DomaLend.sol";

contract InvestigateTokensScript is Script {
    // Doma Protocol contract addresses on testnet
    address public constant DOMA_OWNERSHIP_TOKEN = 0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f;
    
    function run() external {
        vm.startBroadcast();
        
        IDoma doma = IDoma(DOMA_OWNERSHIP_TOKEN);
        
        console.log("=== Investigating Doma Protocol Ownership Token ===");
        console.log("Contract Address:", DOMA_OWNERSHIP_TOKEN);
        console.log("");
        
        // Try to get basic contract info
        console.log("=== Testing Basic ERC-721 Functions ===");
        
        // Test if contract responds to basic calls
        try doma.ownerOf(1) returns (address owner) {
            console.log("Token 1 owner:", owner);
            logTokenDetails(doma, 1);
        } catch {
            console.log("Token 1: Does not exist or contract error");
        }
        
        // Test a range of token IDs to see what exists
        console.log("\n=== Scanning for Existing Tokens (1-100) ===");
        uint256 foundTokens = 0;
        
        for (uint256 i = 1; i <= 100; i++) {
            try doma.ownerOf(i) returns (address owner) {
                if (owner != address(0)) {
                    console.log("Found Token ID:", i, "Owner:", owner);
                    logTokenDetails(doma, i);
                    foundTokens++;
                    
                    // Limit output to prevent spam
                    if (foundTokens >= 10) {
                        console.log("Found", foundTokens, "tokens, stopping scan...");
                        break;
                    }
                }
            } catch {
                // Token doesn't exist, continue
            }
        }
        
        if (foundTokens == 0) {
            console.log("No tokens found in range 1-100");
            console.log("This suggests either:");
            console.log("1. No domains have been tokenized yet");
            console.log("2. Token IDs use a different numbering scheme");
            console.log("3. Contract storage is not accessible this way");
        } else {
            console.log("\nTotal tokens found:", foundTokens);
        }
        
        // Try to call Doma-specific functions
        console.log("\n=== Testing Doma-Specific Functions ===");
        if (foundTokens > 0) {
            // Test with the first found token (ID 1 if it exists)
            try doma.expirationOf(1) returns (uint256 expiration) {
                console.log("Token 1 expiration:", expiration);
                console.log("Expiration date:", block.timestamp < expiration ? "Valid" : "Expired");
            } catch {
                console.log("expirationOf(1) failed - function may not exist or token doesn't exist");
            }
            
            try doma.registrarOf(1) returns (uint256 registrar) {
                console.log("Token 1 registrar ID:", registrar);
            } catch {
                console.log("registrarOf(1) failed - function may not exist or token doesn't exist");
            }
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== Investigation Complete ===");
        console.log("Use this information to:");
        console.log("1. Update tests with real token IDs");
        console.log("2. Understand domain expiration patterns");
        console.log("3. Plan realistic integration testing");
    }
    
    function logTokenDetails(IDoma doma, uint256 tokenId) internal {
        try doma.expirationOf(tokenId) returns (uint256 expiration) {
            console.log("  Expiration:", expiration, block.timestamp < expiration ? "(Valid)" : "(Expired)");
        } catch {
            console.log("  Expiration: Unable to retrieve");
        }
        
        try doma.registrarOf(tokenId) returns (uint256 registrar) {
            console.log("  Registrar ID:", registrar);
        } catch {
            console.log("  Registrar ID: Unable to retrieve");
        }
        
        try doma.tokenURI(tokenId) returns (string memory uri) {
            console.log("  Token URI:", uri);
        } catch {
            console.log("  Token URI: Unable to retrieve");
        }
        
        console.log("");
    }
}