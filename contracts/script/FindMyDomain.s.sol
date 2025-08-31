// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/DomaLend.sol";

// Extended interface for this script
interface IDomaExtended {
    function balanceOf(address owner) external view returns (uint256);
    function ownerOf(uint256 tokenId) external view returns (address);
    function expirationOf(uint256 tokenId) external view returns (uint256);
    function registrarOf(uint256 tokenId) external view returns (uint256);
    function lockStatusOf(uint256 tokenId) external view returns (bool);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract FindMyDomainScript is Script {
    address public constant MY_WALLET = 0xaBA3cF48A81225De43a642ca486C1c069ec11a53;
    address public constant DOMA_OWNERSHIP_TOKEN = 0x424bDf2E8a6F52Bd2c1C81D9437b0DC0309DF90f;
    
    function run() external {
        console.log("=== Finding ranny.io Domain ===");
        console.log("Wallet:", MY_WALLET);
        console.log("Doma Contract:", DOMA_OWNERSHIP_TOKEN);
        console.log("");
        
        IDomaExtended doma = IDomaExtended(DOMA_OWNERSHIP_TOKEN);
        
        // Check balance first
        uint256 balance = doma.balanceOf(MY_WALLET);
        console.log("Domains owned:", balance);
        console.log("");
        
        if (balance == 0) {
            console.log("No domains found. Domain might not be tokenized yet.");
            return;
        }
        
        console.log("=== Scanning for Domain Token ID ===");
        
        // Try a range of token IDs to find yours
        bool found = false;
        for (uint256 i = 1; i <= 100000; i++) {
            try doma.ownerOf(i) returns (address tokenOwner) {
                if (tokenOwner == MY_WALLET) {
                    console.log("FOUND YOUR DOMAIN!");
                    console.log("Token ID:", i);
                    console.log("");
                    
                    // Get all domain details
                    logDomainDetails(doma, i);
                    
                    found = true;
                    break; // Stop after finding first one
                }
            } catch {
                // Token doesn't exist, continue
            }
            
            // Progress indicator every 10000 tokens
            if (i % 10000 == 0) {
                console.log("Checked up to token ID:", i);
            }
        }
        
        if (!found) {
            console.log("Domain not found in range 1-100000");
            console.log("This might indicate:");
            console.log("1. Token ID is higher than 100000");
            console.log("2. Domain might not be fully tokenized yet");
            console.log("3. Domain might be on a different contract");
        }
    }
    
    function logDomainDetails(IDomaExtended doma, uint256 tokenId) internal {
        console.log("=== Domain Details ===");
        
        uint256 expiry = 0;
        bool hasExpiry = false;
        
        try doma.expirationOf(tokenId) returns (uint256 _expiry) {
            expiry = _expiry;
            hasExpiry = true;
            console.log("Expiration timestamp:", expiry);
            if (expiry > block.timestamp) {
                uint256 daysLeft = (expiry - block.timestamp) / 86400;
                console.log("Days until expiry:", daysLeft);
                console.log("Status: ACTIVE");
            } else {
                console.log("Status: EXPIRED");
            }
        } catch {
            console.log("Expiration: Unable to retrieve");
        }
        
        try doma.registrarOf(tokenId) returns (uint256 registrar) {
            console.log("Registrar ID:", registrar);
        } catch {
            console.log("Registrar ID: Unable to retrieve");
        }
        
        try doma.lockStatusOf(tokenId) returns (bool locked) {
            console.log("Locked:", locked);
        } catch {
            console.log("Lock Status: Unable to retrieve");
        }
        
        try doma.tokenURI(tokenId) returns (string memory uri) {
            console.log("Token URI:", uri);
        } catch {
            console.log("Token URI: Unable to retrieve");
        }
        
        console.log("");
        console.log("=== DomaLend Compatibility Check ===");
        
        // Test if this domain would be eligible for loans
        if (hasExpiry) {
            if (block.timestamp < expiry) {
                uint256 timeLeft = expiry - block.timestamp;
                if (timeLeft > 7 days) {
                    console.log("ELIGIBLE: Domain can be used for loans (>7 days remaining)");
                } else {
                    console.log("WARNING: Domain expires soon, may not qualify for long-term loans");
                }
            } else {
                console.log("EXPIRED: Domain not eligible for loans");
            }
        } else {
            console.log("Cannot determine eligibility - expiry unknown");
        }
    }
}