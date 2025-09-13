// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title IDoma
 * @dev Interface for Doma Protocol NFT contract
 */
interface IDoma is IERC721 {
    function expirationOf(uint256 tokenId) external view returns (uint256);
    function exists(uint256 tokenId) external view returns (bool);
}