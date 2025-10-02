import { ethers } from "ethers";
import * as dotenv from "dotenv";
import { generateAndVerifyCreditScore } from "./alchemyFetch";
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
	let operatorSignatureWithSaltAndExpiry = {
		signature: "",
		salt: salt,
		expiry: expiry,
	};

	const operatorDigestHash =
		await avsDirectory.calculateOperatorAVSRegistrationDigestHash(
			wallet.address,
			await domalendServiceManager.getAddress(),
			salt,
			expiry
		);
	console.log(operatorDigestHash);

	// Sign the digest hash with the operator's private key
	console.log("Signing digest hash with operator's private key");
	const operatorSigningKey = new ethers.SigningKey(process.env.PRIVATE_KEY!);
	const operatorSignedDigestHash = operatorSigningKey.sign(operatorDigestHash);

	// Encode the signature in the required format
	operatorSignatureWithSaltAndExpiry.signature = ethers.Signature.from(
		operatorSignedDigestHash
	).serialized;

	console.log("Registering Operator to AVS Registry contract");
	const tx2 = await ecdsaRegistryContract.registerOperatorWithSignature(
		operatorSignatureWithSaltAndExpiry,
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

const main = async () => {
	// await registerOperator();
	monitorNewTasks().catch((error) => {
		console.error("Error monitoring tasks:", error);
	});
};

main().catch((error) => {
	console.error("Error in main function:", error);
});

// signAndRespondToTask(1, [
// 	"0x8757F328371E571308C1271BD82B91882253FDd1",
// 	BigInt(1234567890),
// 	BigInt(9876543210),
// ]);
