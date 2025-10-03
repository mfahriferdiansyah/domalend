import { ethers } from "ethers";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const privateKey = process.env.PRIVATE_KEY!;
const wallet = new ethers.Wallet(privateKey);
const digest = "0x47e533c2448300c31f44c140842692ceaeb88f197dfff60904eda2c52d1aa196";

console.log("Expected signer:", wallet.address);
console.log("Digest:", digest);
console.log("");

// Test current method (SigningKey.sign)
const signingKey = new ethers.SigningKey(privateKey);
const sig = signingKey.sign(digest);
console.log("Method 1: SigningKey.sign() - Raw digest");
console.log("  Signature:", sig.serialized);
console.log("  Recovered:", ethers.recoverAddress(digest, sig));
console.log("  Match:", ethers.recoverAddress(digest, sig).toLowerCase() === wallet.address.toLowerCase());
console.log("");

// Test with wallet.signMessage (adds EIP-191 prefix)
const sig2 = await wallet.signMessage(ethers.getBytes(digest));
console.log("Method 2: wallet.signMessage() - With EIP-191 prefix");
console.log("  Signature:", sig2);
const messageHash = ethers.hashMessage(ethers.getBytes(digest));
console.log("  Message hash:", messageHash);
console.log("  Recovered:", ethers.recoverAddress(messageHash, sig2));
console.log("  Match:", ethers.recoverAddress(messageHash, sig2).toLowerCase() === wallet.address.toLowerCase());
