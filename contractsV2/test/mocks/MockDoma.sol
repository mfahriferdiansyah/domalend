// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/IDoma.sol";

contract MockDoma is IDoma {
    mapping(uint256 => address) private _owners;
    mapping(uint256 => uint256) private _expiries;
    mapping(uint256 => string) private _names;
    mapping(uint256 => address) private _approvals;
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    string public name;
    string public symbol;

    constructor(string memory _name, string memory _symbol) {
        name = _name;
        symbol = _symbol;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return _owners[tokenId];
    }

    function approve(address to, uint256 tokenId) external {
        _approvals[tokenId] = to;
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        return _approvals[tokenId];
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        _transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        _transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        _transferFrom(from, to, tokenId);
    }

    function _transferFrom(address from, address to, uint256 tokenId) internal {
        require(_owners[tokenId] == from, "Not owner");

        bool isOwner = msg.sender == from;
        bool isApproved = _approvals[tokenId] == msg.sender;
        bool isOperator = _operatorApprovals[from][msg.sender];

        require(
            isOwner || isApproved || isOperator,
            "Not approved"
        );

        _owners[tokenId] = to;
        _approvals[tokenId] = address(0);
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        return true;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 1;
    }

    // Mock-specific functions
    function mint(address to, uint256 tokenId) external {
        _owners[tokenId] = to;
    }

    function setExpiry(uint256 tokenId, uint256 expiry) external {
        _expiries[tokenId] = expiry;
    }

    function setName(uint256 tokenId, string memory domainName) external {
        _names[tokenId] = domainName;
    }

    // IDoma interface functions
    function expirationOf(uint256 tokenId) external view returns (uint256) {
        return _expiries[tokenId];
    }

    function exists(uint256 tokenId) external view returns (bool) {
        return _owners[tokenId] != address(0);
    }
}