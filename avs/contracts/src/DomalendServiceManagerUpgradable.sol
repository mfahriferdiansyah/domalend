// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import {ECDSAServiceManagerBase} from
    "@eigenlayer-middleware/src/unaudited/ECDSAServiceManagerBase.sol";
import {ECDSAStakeRegistry} from "@eigenlayer-middleware/src/unaudited/ECDSAStakeRegistry.sol";
import {IServiceManager} from "@eigenlayer-middleware/src/interfaces/IServiceManager.sol";
import {ECDSAUpgradeable} from
    "@openzeppelin-upgrades/contracts/utils/cryptography/ECDSAUpgradeable.sol";
import {IERC1271Upgradeable} from
    "@openzeppelin-upgrades/contracts/interfaces/IERC1271Upgradeable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@eigenlayer/contracts/interfaces/IRewardsCoordinator.sol";
import {TransparentUpgradeableProxy} from
    "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";
import {Initializable} from "@openzeppelin-upgrades/contracts/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin-upgrades/contracts/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin-upgrades/contracts/access/OwnableUpgradeable.sol";
import {IDomalendServiceManagerUpgradable} from "./IDomalendServiceManagerUpgradable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title  Domalend Service Manager (Upgradeable) - Domain Scoring Only
 * @author Ammar Robbani
 * @notice Manages domain scoring tasks for AVS operators
 */
contract DomalendServiceManagerUpgradable is
    ECDSAServiceManagerBase,
    UUPSUpgradeable,
    IDomalendServiceManagerUpgradable
{
    using ECDSAUpgradeable for bytes32;
    using SafeERC20 for IERC20;

    string public constant VERSION = "2.2.1";

    uint32 public latestTaskNum;

    // Domain scoring storage
    mapping(uint32 => bytes32) public domainTaskHashes;
    mapping(address => mapping(uint32 => bytes)) public allTaskResponses;
    mapping(uint256 => DomainScoreData) private _domainScoreData;
    address public aiOracleAddress;

    modifier onlyOperator() {
        require(
            ECDSAStakeRegistry(stakeRegistry).operatorRegistered(msg.sender),
            "Operator must be the caller"
        );
        _;
    }

    modifier onlyAIOracle() {
        require(msg.sender == aiOracleAddress, "Only AIOracle can call");
        _;
    }

    event AIOracleConfigured(address indexed oldAddress, address indexed newAddress);
    event TokensWithdrawn(address indexed token, address indexed to, uint256 amount);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(
        address _avsDirectory,
        address _stakeRegistry,
        address _rewardsCoordinator,
        address _delegationManager
    )
        ECDSAServiceManagerBase(_avsDirectory, _stakeRegistry, _rewardsCoordinator, _delegationManager)
    {
        _disableInitializers();
    }

    /**
     * @notice Initialize the contract (replaces constructor for upgradeable)
     * @param initialOwner The address to which the ownership will be transferred
     * @param _rewardsInitiator The address which is allowed to create AVS rewards submissions
     * @param _aiOracleAddress The address of the AI Oracle contract
     */
    function initialize(
        address initialOwner,
        address _rewardsInitiator,
        address _aiOracleAddress
    ) public initializer {
        __ServiceManagerBase_init(initialOwner, _rewardsInitiator);
        __UUPSUpgradeable_init();

        aiOracleAddress = _aiOracleAddress;
        latestTaskNum = 0;
    }

    /**
     * @notice Authorize upgrade (only owner can upgrade)
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /**
     * @notice Get the current version
     */
    function getVersion() external pure returns (string memory) {
        return VERSION;
    }

    // ========================================
    // === Domain Scoring Functions Only ===
    // ========================================

    // ============ Internal AIOracle Configuration Helper ============

    /**
     * @dev Internal: Set AIOracle address and emit event
     * @param _aiOracleAddress The AIOracle address to set
     */
    function _setAIOracle(address _aiOracleAddress) internal {
        require(_aiOracleAddress != address(0), "Invalid address");
        address oldAddress = aiOracleAddress;
        aiOracleAddress = _aiOracleAddress;
        emit AIOracleConfigured(oldAddress, _aiOracleAddress);
    }

    // ============ AIOracle Configuration ============

    /**
     * @notice Configure AIOracle connection (only owner)
     * @dev Recommended method for setting AIOracle address
     * @param _aiOracleAddress The AIOracle proxy address
     */
    function configureAIOracle(address _aiOracleAddress) external onlyOwner {
        _setAIOracle(_aiOracleAddress);
    }

    /**
     * @notice Set the AI Oracle address (only owner)
     * @dev Prefer using configureAIOracle() for clarity
     * @param _aiOracleAddress The new AI Oracle address
     */
    function setAIOracle(address _aiOracleAddress) external onlyOwner {
        _setAIOracle(_aiOracleAddress);
    }

    /**
     * @notice Create a new domain scoring task for operators (only AIOracle)
     * @param domainTokenId The token ID of the domain to score
     * @param requestId The paid request ID from AIOracle
     * @return newTask The created domain task
     */
    function createDomainScoringTask(
        uint256 domainTokenId,
        uint256 requestId
    ) external onlyAIOracle returns (DomainTask memory) {
        require(domainTokenId > 0, "Invalid domain token ID");
        require(requestId > 0, "Invalid request ID");

        DomainTask memory newTask = DomainTask({
            domainTokenId: domainTokenId,
            requestId: requestId,
            taskCreatedBlock: uint32(block.number),
            taskType: TaskType.DomainScore
        });

        // Store hash of domain task onchain
        domainTaskHashes[latestTaskNum] = keccak256(abi.encode(newTask));
        emit DomainScoringTaskCreated(latestTaskNum, newTask);
        latestTaskNum = latestTaskNum + 1;

        return newTask;
    }

    /**
     * @notice Operator responds to a domain scoring task
     * @param task The domain task being responded to
     * @param score The calculated domain score (0-100)
     * @param ipfsHash The IPFS hash containing score details
     * @param referenceTaskIndex The task index this response is for
     * @param signature The operator's signature
     */
    function respondToDomainTask(
        DomainTask calldata task,
        uint256 score,
        string calldata ipfsHash,
        uint32 referenceTaskIndex,
        bytes calldata signature
    ) external /* onlyOperator */ {
        // Verify task hash
        require(
            keccak256(abi.encode(task)) == domainTaskHashes[referenceTaskIndex],
            "Task does not match recorded hash"
        );
        require(
            allTaskResponses[msg.sender][referenceTaskIndex].length == 0,
            "Operator already responded"
        );
        require(score <= 100, "Score must be 0-100");

        // Store response
        allTaskResponses[msg.sender][referenceTaskIndex] = signature;

        // Store domain score data
        _domainScoreData[task.domainTokenId] =
            DomainScoreData({score: score, lastUpdate: block.timestamp, ipfsHash: ipfsHash});

        emit DomainScoreSubmitted(task.domainTokenId, score, ipfsHash, msg.sender);

        // Call AIOracle to submit paid score (if address is set)
        if (aiOracleAddress != address(0)) {
            (bool success,) = aiOracleAddress.call(
                abi.encodeWithSignature(
                    "submitPaidScore(uint256,uint256,uint256,address)",
                    task.requestId,
                    task.domainTokenId,
                    score,
                    msg.sender
                )
            );
            require(success, "AIOracle paid submission failed");
        }
    }

    /**
     * @notice Get domain score data
     * @param domainTokenId The token ID of the domain
     * @return The domain score data
     */
    function getDomainScoreData(
        uint256 domainTokenId
    ) external view returns (DomainScoreData memory) {
        return _domainScoreData[domainTokenId];
    }

    // ============ Token Management (Emergency/Maintenance) ============

    /**
     * @notice Withdraw tokens from contract (only owner)
     * @dev Normal operation: payments go directly to operators via AIOracle
     *      This function withdraws accidentally sent tokens or native balance
     * @param token ERC20 token address (use address(0) for native DOMA)
     * @param to Recipient address
     * @param amount Amount to withdraw
     */
    function withdrawTokens(address token, address to, uint256 amount)
        external
        onlyOwner
    {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        if (token == address(0)) {
            // Withdraw native tokens (DOMA/ETH)
            (bool success, ) = to.call{value: amount}("");
            require(success, "Native transfer failed");
        } else {
            // Withdraw ERC20 tokens
            IERC20(token).safeTransfer(to, amount);
        }

        emit TokensWithdrawn(token, to, amount);
    }

    /**
     * @notice Get ERC20 token balance held by this contract
     * @param token ERC20 token address
     * @return balance The token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        require(token != address(0), "Invalid token address");
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @notice Get native token balance held by this contract
     * @return balance The native token balance (DOMA)
     */
    function getNativeBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /**
     * @dev Storage gap for future upgrades
     */
    uint256[44] private __gap;
}
