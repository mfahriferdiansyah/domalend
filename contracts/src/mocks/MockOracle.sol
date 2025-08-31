// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockOracle {
    mapping(uint256 => uint256) public domainScores;
    mapping(uint256 => uint256) public domainValues;
    
    uint256 public constant DEFAULT_SCORE = 50;
    uint256 public constant DEFAULT_VALUE = 20000 * 1e6; // 20,000 USDC
    
    function setDomainScore(uint256 tokenId, uint256 score) external {
        require(score <= 100, "Score must be <= 100");
        domainScores[tokenId] = score;
    }
    
    function setDomainValue(uint256 tokenId, uint256 value) external {
        domainValues[tokenId] = value;
    }
    
    function scoreDomain(uint256 tokenId) external view returns (uint256) {
        uint256 score = domainScores[tokenId];
        return score > 0 ? score : DEFAULT_SCORE;
    }
    
    function getDomainValue(uint256 tokenId) external view returns (uint256) {
        uint256 value = domainValues[tokenId];
        return value > 0 ? value : DEFAULT_VALUE;
    }
    
    function getMaxLoanAmount(uint256 tokenId) external view returns (uint256) {
        uint256 value = this.getDomainValue(tokenId);
        // 50% LTV ratio
        return value / 2;
    }
}