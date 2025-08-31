// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockDoma is ERC721 {
    uint256 private _nextTokenId = 1;
    
    mapping(uint256 => string) public domainNames;
    mapping(uint256 => uint256) public domainExpiry;
    mapping(uint256 => uint256) public registrarIds;
    mapping(uint256 => bool) public domainLockStatus;
    
    constructor() ERC721("Doma Protocol", "DOMA") {}
    
    // Legacy function for backward compatibility
    function mintDomain(address to, string memory name) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        domainNames[tokenId] = name;
        domainExpiry[tokenId] = block.timestamp + 365 days;
        registrarIds[tokenId] = 1; // Default registrar ID
        return tokenId;
    }
    
    // Doma Protocol compatible functions (from real interface)
    function expirationOf(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Domain does not exist");
        return domainExpiry[tokenId];
    }
    
    function registrarOf(uint256 tokenId) external view returns (uint256) {
        require(_ownerOf(tokenId) != address(0), "Domain does not exist");
        return registrarIds[tokenId];
    }
    
    // Additional Doma Protocol functions (discovered from real contract)
    function exists(uint256 tokenId) external view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    function lockStatusOf(uint256 tokenId) external view returns (bool) {
        require(_ownerOf(tokenId) != address(0), "Domain does not exist");
        return domainLockStatus[tokenId];
    }
    
    // Legacy function for backward compatibility
    function getDomainInfo(uint256 tokenId) external view returns (string memory name, uint256 expiry) {
        require(_ownerOf(tokenId) != address(0), "Domain does not exist");
        return (domainNames[tokenId], domainExpiry[tokenId]);
    }
    
    // Test helper functions
    function setDomainExpiry(uint256 tokenId, uint256 expiry) external {
        require(_ownerOf(tokenId) != address(0), "Domain does not exist");
        domainExpiry[tokenId] = expiry;
    }
    
    function setRegistrar(uint256 tokenId, uint256 registrarId) external {
        require(_ownerOf(tokenId) != address(0), "Domain does not exist");
        registrarIds[tokenId] = registrarId;
    }
    
    function setLockStatus(uint256 tokenId, bool locked) external {
        require(_ownerOf(tokenId) != address(0), "Domain does not exist");
        domainLockStatus[tokenId] = locked;
    }
    
    // Create domain with specific expiry for testing
    function mintDomainWithExpiry(address to, string memory name, uint256 expiry) external returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        domainNames[tokenId] = name;
        domainExpiry[tokenId] = expiry;
        registrarIds[tokenId] = 1;
        return tokenId;
    }
}