// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/AIOracle.sol";

contract AIOracleTest is Test {
    AIOracle public oracle;
    address public owner;
    address public backendService;
    address public user1;
    address public user2;

    uint256 constant DOMAIN_TOKEN_ID_1 = 1;
    uint256 constant DOMAIN_TOKEN_ID_2 = 2;
    uint256 constant NIKE_SCORE = 98;
    uint256 constant COCA_COLA_SCORE = 96;
    uint256 constant RANDOM_SCORE = 15;

    event ScoringRequested(
        uint256 indexed domainTokenId,
        address indexed requester,
        uint256 timestamp
    );

    event ScoreSubmitted(
        uint256 indexed domainTokenId,
        uint256 score,
        address indexed submittedBy,
        uint256 timestamp
    );

    event BatchScoresSubmitted(
        uint256[] domainTokenIds,
        uint256[] scores,
        address indexed submittedBy,
        uint256 batchSize,
        uint256 timestamp
    );

    event BackendServiceUpdated(
        address indexed oldService,
        address indexed newService,
        address indexed updatedBy,
        uint256 timestamp
    );

    function setUp() public {
        owner = makeAddr("owner");
        backendService = makeAddr("backendService");
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");

        vm.prank(owner);
        oracle = new AIOracle(owner);

        vm.prank(owner);
        oracle.setBackendService(backendService);
    }

    function testConstructor() public {
        assertTrue(oracle.hasRole(oracle.DEFAULT_ADMIN_ROLE(), owner));
        assertEq(oracle.owner(), owner);
        assertEq(oracle.totalScoresSubmitted(), 0);
        assertEq(oracle.totalScoringRequests(), 0);
        assertFalse(oracle.emergencyPaused());
    }

    function testSetBackendService() public {
        address newBackend = makeAddr("newBackend");

        vm.expectEmit(true, true, true, true);
        emit BackendServiceUpdated(backendService, newBackend, owner, block.timestamp);

        vm.prank(owner);
        oracle.setBackendService(newBackend);

        assertEq(oracle.backendService(), newBackend);
        assertTrue(oracle.hasRole(oracle.SCORING_SERVICE_ROLE(), newBackend));
        assertFalse(oracle.hasRole(oracle.SCORING_SERVICE_ROLE(), backendService));
    }

    function testSetBackendServiceUnauthorized() public {
        address newBackend = makeAddr("newBackend");

        vm.prank(user1);
        vm.expectRevert();
        oracle.setBackendService(newBackend);
    }

    function testRequestScoring() public {
        vm.expectEmit(true, true, false, true);
        emit ScoringRequested(DOMAIN_TOKEN_ID_1, user1, block.timestamp);

        vm.prank(user1);
        oracle.requestScoring(DOMAIN_TOKEN_ID_1);

        assertEq(oracle.totalScoringRequests(), 1);
        assertEq(oracle.userRequests(user1), 1);
    }

    function testBatchRequestScoring() public {
        uint256[] memory domainIds = new uint256[](2);
        domainIds[0] = DOMAIN_TOKEN_ID_1;
        domainIds[1] = DOMAIN_TOKEN_ID_2;

        vm.prank(user1);
        oracle.batchRequestScoring(domainIds);

        assertEq(oracle.totalScoringRequests(), 2);
        assertEq(oracle.userRequests(user1), 2);
    }

    function testBatchRequestScoringEmptyArray() public {
        uint256[] memory emptyArray = new uint256[](0);

        vm.prank(user1);
        vm.expectRevert("Empty domain list");
        oracle.batchRequestScoring(emptyArray);
    }

    function testSubmitScore() public {
        vm.expectEmit(true, false, true, true);
        emit ScoreSubmitted(DOMAIN_TOKEN_ID_1, NIKE_SCORE, backendService, block.timestamp);

        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);

        assertEq(oracle.totalScoresSubmitted(), 1);

        (uint256 score, bool isValid, uint256 timestamp) = oracle.getDomainScore(DOMAIN_TOKEN_ID_1);
        assertEq(score, NIKE_SCORE);
        assertTrue(isValid);
        assertEq(timestamp, block.timestamp);
    }

    function testSubmitScoreUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert("Not authorized backend service");
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);
    }

    function testSubmitScoreInvalidScore() public {
        vm.prank(backendService);
        vm.expectRevert("Score must be 0-100");
        oracle.submitScore(DOMAIN_TOKEN_ID_1, 101);
    }

    function testSubmitScoreWhenPaused() public {
        vm.prank(owner);
        oracle.emergencyPause(true);

        vm.prank(backendService);
        vm.expectRevert("Oracle is paused");
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);
    }

    function testBatchSubmitScores() public {
        uint256[] memory domainIds = new uint256[](2);
        domainIds[0] = DOMAIN_TOKEN_ID_1;
        domainIds[1] = DOMAIN_TOKEN_ID_2;

        uint256[] memory scores = new uint256[](2);
        scores[0] = NIKE_SCORE;
        scores[1] = COCA_COLA_SCORE;

        vm.expectEmit(false, false, true, true);
        emit BatchScoresSubmitted(domainIds, scores, backendService, 2, block.timestamp);

        vm.prank(backendService);
        oracle.batchSubmitScores(domainIds, scores);

        assertEq(oracle.totalScoresSubmitted(), 2);
        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_1), NIKE_SCORE);
        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_2), COCA_COLA_SCORE);
    }

    function testBatchSubmitScoresMismatchedArrays() public {
        uint256[] memory domainIds = new uint256[](2);
        domainIds[0] = DOMAIN_TOKEN_ID_1;
        domainIds[1] = DOMAIN_TOKEN_ID_2;

        uint256[] memory scores = new uint256[](1);
        scores[0] = NIKE_SCORE;

        vm.prank(backendService);
        vm.expectRevert("Array length mismatch");
        oracle.batchSubmitScores(domainIds, scores);
    }

    function testBatchSubmitScoresEmptyArrays() public {
        uint256[] memory emptyDomainIds = new uint256[](0);
        uint256[] memory emptyScores = new uint256[](0);

        vm.prank(backendService);
        vm.expectRevert("Empty arrays");
        oracle.batchSubmitScores(emptyDomainIds, emptyScores);
    }

    function testBatchSubmitScoresInvalidScore() public {
        uint256[] memory domainIds = new uint256[](1);
        domainIds[0] = DOMAIN_TOKEN_ID_1;

        uint256[] memory scores = new uint256[](1);
        scores[0] = 101;

        vm.prank(backendService);
        vm.expectRevert("Score must be 0-100");
        oracle.batchSubmitScores(domainIds, scores);
    }

    function testScoreDomain() public {
        // Submit a score first
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);

        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_1), NIKE_SCORE);
    }

    function testScoreDomainNoScore() public {
        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_1), oracle.DEFAULT_SCORE());
    }

    function testScoreDomainExpired() public {
        // Submit a score
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);

        // Fast forward past validity period
        vm.warp(block.timestamp + oracle.SCORE_VALIDITY_PERIOD() + 1);

        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_1), oracle.DEFAULT_SCORE());
    }

    function testHasValidScore() public {
        // No score initially
        assertFalse(oracle.hasValidScore(DOMAIN_TOKEN_ID_1));

        // Submit score
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);

        assertTrue(oracle.hasValidScore(DOMAIN_TOKEN_ID_1));

        // Expire score
        vm.warp(block.timestamp + oracle.SCORE_VALIDITY_PERIOD() + 1);
        assertFalse(oracle.hasValidScore(DOMAIN_TOKEN_ID_1));
    }

    function testGetScoreAge() public {
        // No score initially
        assertEq(oracle.getScoreAge(DOMAIN_TOKEN_ID_1), 0);

        // Submit score
        uint256 submitTime = block.timestamp;
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);

        // Check age after 1 hour
        vm.warp(submitTime + 1 hours);
        assertEq(oracle.getScoreAge(DOMAIN_TOKEN_ID_1), 1 hours);
    }

    function testNeedsRefresh() public {
        // No score initially - needs refresh
        assertTrue(oracle.needsRefresh(DOMAIN_TOKEN_ID_1));

        // Submit score - doesn't need refresh
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);
        assertFalse(oracle.needsRefresh(DOMAIN_TOKEN_ID_1));

        // Expire score - needs refresh again
        vm.warp(block.timestamp + oracle.SCORE_VALIDITY_PERIOD() + 1);
        assertTrue(oracle.needsRefresh(DOMAIN_TOKEN_ID_1));
    }

    function testInvalidateScore() public {
        // Submit score
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);

        assertTrue(oracle.hasValidScore(DOMAIN_TOKEN_ID_1));

        // Invalidate score
        vm.prank(owner);
        oracle.invalidateScore(DOMAIN_TOKEN_ID_1, "Incorrect calculation");

        assertFalse(oracle.hasValidScore(DOMAIN_TOKEN_ID_1));
        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_1), oracle.DEFAULT_SCORE());
    }

    function testInvalidateScoreUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        oracle.invalidateScore(DOMAIN_TOKEN_ID_1, "Unauthorized attempt");
    }

    function testEmergencyPause() public {
        // Initially not paused
        assertFalse(oracle.emergencyPaused());

        // Pause
        vm.prank(owner);
        oracle.emergencyPause(true);
        assertTrue(oracle.emergencyPaused());

        // Unpause
        vm.prank(owner);
        oracle.emergencyPause(false);
        assertFalse(oracle.emergencyPaused());
    }

    function testEmergencyPauseUnauthorized() public {
        vm.prank(user1);
        vm.expectRevert();
        oracle.emergencyPause(true);
    }

    function testGetTotalStats() public {
        // Submit some requests and scores
        vm.prank(user1);
        oracle.requestScoring(DOMAIN_TOKEN_ID_1);

        vm.prank(user2);
        oracle.requestScoring(DOMAIN_TOKEN_ID_2);

        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);

        (uint256 totalRequests, uint256 totalSubmissions,,) = oracle.getTotalStats();

        assertEq(totalRequests, 2);
        assertEq(totalSubmissions, 1);
    }

    function testScoreOverwrite() public {
        // Submit initial score
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, RANDOM_SCORE);
        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_1), RANDOM_SCORE);

        // Overwrite with new score
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, NIKE_SCORE);
        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_1), NIKE_SCORE);

        // Total submissions should be 2
        assertEq(oracle.totalScoresSubmitted(), 2);
    }

    function testBoundaryScores() public {
        // Test minimum score (0)
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_1, 0);
        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_1), 0);

        // Test maximum score (100)
        vm.prank(backendService);
        oracle.submitScore(DOMAIN_TOKEN_ID_2, 100);
        assertEq(oracle.scoreDomain(DOMAIN_TOKEN_ID_2), 100);
    }

    function testMultipleUsersRequests() public {
        vm.prank(user1);
        oracle.requestScoring(DOMAIN_TOKEN_ID_1);

        vm.prank(user2);
        oracle.requestScoring(DOMAIN_TOKEN_ID_2);

        assertEq(oracle.userRequests(user1), 1);
        assertEq(oracle.userRequests(user2), 1);
        assertEq(oracle.totalScoringRequests(), 2);
    }

    function testConstants() public {
        assertEq(oracle.SCORE_VALIDITY_PERIOD(), 24 hours);
        assertEq(oracle.DEFAULT_SCORE(), 0);
    }
}