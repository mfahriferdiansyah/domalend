#!/bin/bash

# Domain and contract details
DOMAIN_TOKEN_ID="88671632944350260182054337326948197065730449395331703904775592158135986016911"
POOL_ID="4"
AMOUNT="1000000" 

# Contract addresses
AI_ORACLE="0x7Db5ebf2cf03A926F66651D5D693E36A329628bB"
SATORU_LENDING="0xfe94eE06009e078159cC3218285D391804002593"

# RPC URL
RPC_URL="https://rpc-testnet.doma.xyz"

echo "🔍 Checking Domain On-Chain State"
echo "=================================="
echo "Domain Token ID: $DOMAIN_TOKEN_ID"
echo "Pool ID: $POOL_ID"
echo "Amount: 100 USDC"
echo ""

echo "📊 AI Oracle Contract ($AI_ORACLE):"
echo "-----------------------------------"

# Check getDomainScore
echo "1. getDomainScore():"
cast call $AI_ORACLE "getDomainScore(uint256)(uint256,bool,uint256)" $DOMAIN_TOKEN_ID --rpc-url $RPC_URL

# Check hasValidScore
echo "2. hasValidScore():"
cast call $AI_ORACLE "hasValidScore(uint256)(bool)" $DOMAIN_TOKEN_ID --rpc-url $RPC_URL

# Check isScoreValid
echo "3. isScoreValid():"
cast call $AI_ORACLE "isScoreValid(uint256)(bool)" $DOMAIN_TOKEN_ID --rpc-url $RPC_URL

# Check needsRefresh
echo "4. needsRefresh():"
cast call $AI_ORACLE "needsRefresh(uint256)(bool)" $DOMAIN_TOKEN_ID --rpc-url $RPC_URL

# Check getScoreAge
echo "5. getScoreAge():"
AGE_SECONDS=$(cast call $AI_ORACLE "getScoreAge(uint256)(uint256)" $DOMAIN_TOKEN_ID --rpc-url $RPC_URL)
echo "Age in seconds: $AGE_SECONDS"
# Convert to hours (basic calculation)
if [ "$AGE_SECONDS" != "0" ]; then
    echo "Age in hours: $(echo "scale=2; $AGE_SECONDS / 3600" | bc)"
fi

echo ""
echo "💰 Satoru Lending Contract ($SATORU_LENDING):"
echo "--------------------------------------------"

# Check canGetInstantLoan with the domain owner address
DOMAIN_OWNER="0xaBA3cF48A81225De43a642ca486C1c069ec11a53"
echo "6. canGetInstantLoan() - Calling from domain owner address ($DOMAIN_OWNER):"
cast call $SATORU_LENDING "canGetInstantLoan(uint256,uint256,uint256)(bool,string)" $DOMAIN_TOKEN_ID $POOL_ID $AMOUNT --from $DOMAIN_OWNER --rpc-url $RPC_URL

echo ""
echo "📋 Analysis:"
echo "- If hasValidScore() returns true, the domain is properly scored on-chain"
echo "- canGetInstantLoan() should now return true if domain is eligible for the loan"
echo "- If it returns false, check the reason for specific validation failure"