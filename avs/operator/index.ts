import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { generateAndVerifyCreditScore } from "./alchemyFetch";
import { IpfsUploader } from "./ipfsUploader";
import { OpenAIAnalyzer } from "./openaiAnalyzer";
import { OpenAIAnalyzerZkFetch } from "./openaiAnalyzerZkFetch";
import { DomainResolver } from "./domainResolver";
const fs = require("fs");
const path = require("path");
dotenv.config();

// Check if the process.env object is empty
if (!Object.keys(process.env).length) {
	throw new Error("process.env object is empty");
}

// Setup env variables
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL!);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
/// TODO: Hack
let chainId = process.env.CHAIN_ID!;
// let chainId = 421614;

const USE_ZKFETCH = process.env.USE_ZKFETCH === "true"; // Set to "true" to use zkFetch version
const ipfsUploader = new IpfsUploader();
const openaiAnalyzer = USE_ZKFETCH
	? new OpenAIAnalyzerZkFetch()
	: new OpenAIAnalyzer();
const domainResolver = new DomainResolver(provider);
const AI_ORACLE_ADDRESS = process.env.AIORACLE_PROXY;

console.log(
	`🤖 Operator initialized with ${
		USE_ZKFETCH ? "zkFetch (with ZK proofs)" : "OpenAI SDK (direct)"
	} scoring method`
);

const avsDeploymentData = JSON.parse(
	fs.readFileSync(
		path.resolve(
			__dirname,
			`../contracts/deployments/contracts/${chainId}.json`
		),
		"utf8"
	)
);
// Load core deployment data
const coreDeploymentData = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, `../contracts/deployments/core/${chainId}.json`),
		"utf8"
	)
);

const delegationManagerAddress = coreDeploymentData.addresses.delegation;
const avsDirectoryAddress = coreDeploymentData.addresses.avsDirectory;
const domalendServiceManagerAddress =
	avsDeploymentData.addresses.serviceManager;
const ecdsaStakeRegistryAddress = avsDeploymentData.addresses.stakeRegistry;

// Load ABIs
const delegationManagerABI = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "../abis/IDelegationManager.json"),
		"utf8"
	)
);
const ecdsaRegistryABI = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "../abis/ECDSAStakeRegistry.json"),
		"utf8"
	)
);
const domalendServiceManagerABI = JSON.parse(
	fs.readFileSync(
		path.resolve(__dirname, "../abis/DomalendServiceManager.json"),
		"utf8"
	)
);
const avsDirectoryABI = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, "../abis/IAVSDirectory.json"), "utf8")
);
const aiOracleABI = JSON.parse(
	fs.readFileSync(path.resolve(__dirname, "../abis/AIOracle.json"), "utf8")
);

// Initialize contract objects from ABIs
const delegationManager = new ethers.Contract(
	delegationManagerAddress,
	delegationManagerABI,
	wallet
);
const domalendServiceManager = new ethers.Contract(
	domalendServiceManagerAddress,
	domalendServiceManagerABI,
	wallet
);
const ecdsaRegistryContract = new ethers.Contract(
	ecdsaStakeRegistryAddress,
	ecdsaRegistryABI,
	wallet
);
const avsDirectory = new ethers.Contract(
	avsDirectoryAddress,
	avsDirectoryABI,
	wallet
);
const aiOracle = new ethers.Contract(AI_ORACLE_ADDRESS!, aiOracleABI, wallet);

// Enhanced function to score domain using OpenAI directly and upload to IPFS
const scoreDomainWithAI = async (
	tokenId: string
): Promise<{
	score: number;
	ipfsHash: string;
	ipfsUrl: string;
	domainName: string;
	zkProof?: any; // Optional ZK proof if using zkFetch
}> => {
	try {
		console.log(`Resolving domain for tokenId ${tokenId}...`);

		// 1. Resolve tokenId → domain name from NFT contract
		const domainName = await domainResolver.resolveDomainName(tokenId);
		if (!domainName) {
			throw new Error(`Failed to resolve domain name for tokenId ${tokenId}`);
		}

		console.log(
			`Analyzing domain ${domainName} with ${
				USE_ZKFETCH ? "zkFetch + ZK proofs" : "OpenAI SDK"
			}...`
		);

		// 2. Call OpenAI directly - TRUE DECENTRALIZATION
		const analysis = await openaiAnalyzer.analyzeDomain(domainName);

		console.log(
			`OpenAI returned score ${analysis.score} for ${domainName} (confidence: ${analysis.confidence}%)`
		);

		// Check if zkProof is present (zkFetch version)
		const hasZkProof = "zkProof" in analysis;
		if (hasZkProof) {
			console.log(
				`✅ ZK Proof generated for ${domainName} - cryptographically verifiable!`
			);
		}

		// 3. Upload score data to IPFS for transparency
		const scoreData: any = {
			domain: domainName,
			tokenId,
			score: analysis.score,
			confidence: analysis.confidence,
			reasoning: analysis.reasoning,
			operatorAddress: await wallet.getAddress(),
			timestamp: new Date().toISOString(),
		};

		// Add ZK proof to IPFS data if available
		if (hasZkProof) {
			scoreData.zkProof = (analysis as any).zkProof;
			scoreData.proofVerified = true;
		}

		const ipfsResult = await ipfsUploader.uploadScoreData(scoreData);

		console.log(`Uploaded to IPFS: ${ipfsResult.ipfsUrl}`);

		return {
			score: analysis.score,
			ipfsHash: ipfsResult.ipfsHash,
			ipfsUrl: ipfsResult.ipfsUrl,
			domainName,
			zkProof: hasZkProof ? (analysis as any).zkProof : undefined,
		};
	} catch (error) {
		console.error("Error scoring domain with AI:", error);
		throw error;
	}
};

const signAndRespondToTask = async (
	taskIndex: number,
	task: [string, bigint]
) => {
	try {
		console.log(`Processing Task #${taskIndex}...`);
		const walletAddress = task[0];

		const proofData = await generateAndVerifyCreditScore(walletAddress);
		// console.log(JSON.stringify(proofData, null, 2));

		if (!proofData) {
			console.error("Failed to generate and verify credit score.");
			return;
		}
		const finalCScore = proofData.proof.extractedParameterValues.score;
		console.log(`CScore for task #${task[0]}:`, finalCScore);

		const messageHash = ethers.solidityPackedKeccak256(
			["string"],
			[`Respond task with index ${task[0]}`]
		);
		const messageBytes = ethers.getBytes(messageHash);
		const signature = await wallet.signMessage(messageBytes);

		console.log(`Signing and responding to task ${taskIndex}`);

		const operators = [await wallet.getAddress()];
		const signatures = [signature];
		const signedTask = ethers.AbiCoder.defaultAbiCoder().encode(
			["address[]", "bytes[]", "uint32"],
			[
				operators,
				signatures,
				ethers.toBigInt((await provider.getBlockNumber()) - 1),
			]
		);
		const tx = await domalendServiceManager.respondToTask(
			{ user: task[0], taskCreatedBlock: task[1] },
			finalCScore,
			taskIndex,
			signedTask,
			{
				gasLimit: ethers.parseUnits("1500000", "wei"), // Example gas limit
			}
		);
		await tx.wait();
		console.log(`Responded to task...`);
	} catch (err) {
		console.error("An error occurred during task processing:", err);
	}
};

const registerOperator = async () => {
	console.log("Registering as an Operator in EigenLayer...");
	try {
		const tx1 = await delegationManager.registerAsOperator(
			{
				__deprecated_earningsReceiver: await wallet.address,
				delegationApprover: "0x0000000000000000000000000000000000000000",
				stakerOptOutWindowBlocks: 0,
			},
			""
		);
		await tx1.wait();
		console.log("Operator registered to Core EigenLayer contracts");
	} catch (error) {
		console.error("Error in registering as operator:", error);
	}

	const salt = ethers.hexlify(ethers.randomBytes(32));
	const expiry = Math.floor(Date.now() / 1000) + 3600;
	const operatorSignature = {
		signature: "",
		salt: salt,
		expiry: expiry,
	};

	const serviceManagerAddr = await domalendServiceManager.getAddress();
	console.log("ServiceManager address for digest:", serviceManagerAddr);
	const operatorDigestHash =
		await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
			wallet.address,
			serviceManagerAddr,
			salt,
			expiry
		);
	console.log(operatorDigestHash);

	// Sign the digest hash directly (raw signature without EIP-191 prefix)
	console.log("Signing digest hash with operator's private key");
	const operatorSigningKey = new ethers.SigningKey(process.env.PRIVATE_KEY!);
	const operatorSignedDigestHash = operatorSigningKey.sign(operatorDigestHash);
	operatorSignature.signature = operatorSignedDigestHash.serialized;

	// Check if already registered
	try {
		const isRegistered = await ecdsaRegistryContract.operatorRegistered(
			wallet.address
		);
		if (isRegistered) {
			console.log("Operator already registered on AVS");
			return;
		}
	} catch (err) {
		console.log(
			"Could not check registration status, proceeding with registration..."
		);
	}

	console.log("Registering Operator to AVS Registry contract");
	const tx2 = await ecdsaRegistryContract.registerOperatorWithSignature(
		[
			operatorSignature.signature,
			operatorSignature.salt,
			operatorSignature.expiry,
		],
		wallet.address
	);
	await tx2.wait();
	console.log("Operator registered on AVS successfully");
};

// export const monitorNewTasks = async () => {
// 	console.log("Monitoring for new tasks...");

// 	domalendServiceManager.on(
// 		"NewTaskCreated",
// 		async (taskIndex: number, task: any) => {
// 			console.log(taskIndex, task);
// 			console.log(`New task detected: Task, #${taskIndex}`);
// 			await signAndRespondToTask(taskIndex, task);
// 		}
// 	);
// };

export const monitorNewTasks = async () => {
	console.log("Monitoring for new tasks...");

	const eventTopic = ethers.id("NewTaskCreated(uint32,(address,uint32))");
	let latestBlock = await provider.getBlockNumber(); // Track last block
	let isFetching = false;
	const taskQueue = new Set();
	const processedTasks = new Set();
	const blockRangeLimit = 100; // Limit the block range to 100

	const fetchEvents = async () => {
		if (isFetching) return;
		isFetching = true;

		try {
			const newBlock = await provider.getBlockNumber();
			if (newBlock <= latestBlock) return;

			let fromBlock = latestBlock + 1;
			while (fromBlock <= newBlock) {
				const toBlock = Math.min(fromBlock + blockRangeLimit - 1, newBlock);

				const logs = await provider.getLogs({
					address: domalendServiceManager,
					fromBlock: fromBlock,
					toBlock: toBlock,
					topics: [eventTopic],
				});

				for (const log of logs) {
					const parsedLog = domalendServiceManager.interface.parseLog(log);
					if (!parsedLog) continue;

					const taskIndex = parsedLog.args[0];
					const task = parsedLog.args[1];

					if (taskQueue.has(taskIndex) || processedTasks.has(taskIndex))
						continue;

					taskQueue.add(taskIndex);
					console.log(`New task detected: Task, #${taskIndex}`);

					await signAndRespondToTask(taskIndex, task);
					processedTasks.add(taskIndex);
					taskQueue.delete(taskIndex);
				}

				fromBlock = toBlock + 1;
			}

			latestBlock = newBlock;
		} catch (error) {
			console.error("Error fetching logs:", error);
		} finally {
			isFetching = false;
			processedTasks.clear();
		}
	};

	// Poll every 10 seconds
	setInterval(fetchEvents, 10000);
};

// Monitor ServiceManager DomainScoringTaskCreated events and respond with domain scores
export const monitorServiceManagerEvents = async () => {
	console.log(
		"Monitoring ServiceManager for DomainScoringTaskCreated events..."
	);

	const eventTopic = ethers.id(
		"DomainScoringTaskCreated(uint32,(uint256,uint256,uint32,uint8))"
	);
	let latestBlock = await provider.getBlockNumber();
	let isFetching = false;
	const processedTasks = new Set();
	const blockRangeLimit = 100;
	let consecutiveErrors = 0;

	const fetchEvents = async () => {
		if (isFetching) return;
		isFetching = true;

		try {
			const newBlock = await provider.getBlockNumber();
			consecutiveErrors = 0; // Reset on success
			if (newBlock <= latestBlock) return;

			let fromBlock = latestBlock + 1;
			while (fromBlock <= newBlock) {
				const toBlock = Math.min(fromBlock + blockRangeLimit - 1, newBlock);

				const logs = await provider.getLogs({
					address: domalendServiceManagerAddress,
					fromBlock: fromBlock,
					toBlock: toBlock,
					topics: [eventTopic],
				});

				for (const log of logs) {
					const parsedLog = domalendServiceManager.interface.parseLog(log);
					if (!parsedLog) continue;

					const taskIndex = parsedLog.args[0];
					const taskRaw = parsedLog.args[1];
					const domainTokenId = taskRaw[0].toString(); // domainTokenId is first field in DomainTask

					// Create mutable copy of task tuple for contract call (as array)
					const task = [
						taskRaw[0], // domainTokenId
						taskRaw[1], // requestId
						taskRaw[2], // taskCreatedBlock
						taskRaw[3], // taskType
					];

					if (processedTasks.has(taskIndex.toString())) continue;

					processedTasks.add(taskIndex.toString());
					console.log(
						`New domain scoring task #${taskIndex} detected for domain tokenId: ${domainTokenId}`
					);

					try {
						// Get score from OpenAI directly and upload to IPFS
						const result = await scoreDomainWithAI(domainTokenId);

						// Create signature for task response
						const messageHash = ethers.solidityPackedKeccak256(
							["string"],
							[`Respond domain task ${taskIndex}`]
						);
						const messageBytes = ethers.getBytes(messageHash);
						const signature = await wallet.signMessage(messageBytes);

						// Submit score through ServiceManager
						console.log(
							`Submitting score ${result.score} for domain ${result.domainName} (tokenId: ${domainTokenId}, IPFS: ${result.ipfsUrl}) through ServiceManager`
						);
						const tx = await domalendServiceManager.respondToDomainTask(
							task,
							result.score,
							result.ipfsHash,
							taskIndex,
							signature,
							{
								gasLimit: ethers.parseUnits("1500000", "wei"),
							}
						);
						await tx.wait();
						console.log(
							`Successfully submitted score ${result.score} for domain ${result.domainName} (tokenId: ${domainTokenId}) via ServiceManager`
						);
					} catch (error) {
						console.error(`Error processing task ${taskIndex}:`, error);
						processedTasks.delete(taskIndex.toString()); // Allow retry
					}
				}

				fromBlock = toBlock + 1;
			}

			latestBlock = newBlock;
		} catch (error: any) {
			consecutiveErrors++;

			// Distinguish between RPC errors and other errors
			const isRpcError =
				error?.code === "SERVER_ERROR" ||
				error?.info?.responseStatus?.includes("503");

			if (isRpcError) {
				console.error(
					`⚠️  RPC unavailable (attempt ${consecutiveErrors}): ${
						error.shortMessage || error.message
					}`
				);
				console.error(`   Will retry in 10 seconds...`);
			} else {
				console.error(
					`Error fetching ServiceManager logs (attempt ${consecutiveErrors}):`,
					error
				);
			}

			// Log warning if errors persist
			if (consecutiveErrors >= 3) {
				console.warn(
					`⚠️  ${consecutiveErrors} consecutive errors. Check RPC status: https://rpc-testnet.doma.xyz`
				);
			}
		} finally {
			isFetching = false;
		}
	};

	// Poll every 10 seconds
	setInterval(fetchEvents, 10000);
	// Initial fetch
	await fetchEvents();
};

const main = async () => {
	// await registerOperator(); // Commented out - not required since onlyOperator modifier is disabled

	// Monitor ServiceManager for domain scoring tasks
	monitorServiceManagerEvents().catch((error) => {
		console.error("Error monitoring ServiceManager:", error);
	});

	// Keep old task monitoring (for wallet credit scoring)
	// monitorNewTasks().catch((error) => {
	// 	console.error("Error monitoring tasks:", error);
	// });
};

main().catch((error) => {
	console.error("Error in main function:", error);
});

// signAndRespondToTask(1, [
// 	"0x8757F328371E571308C1271BD82B91882253FDd1",
// 	BigInt(1234567890),
// 	BigInt(9876543210),
// ]);
