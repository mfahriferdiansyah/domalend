# AI Scoring Methods - Comparison

The operator supports two methods for AI domain scoring. You can switch between them using the `USE_ZKFETCH` environment variable.

## Version 1: OpenAI SDK (Direct API) ⚡️
**File:** `openaiAnalyzer.ts`
**Speed:** ~1-2 seconds
**Proof:** None (trust-based)

### How it works:
```typescript
import OpenAI from "openai";
const openai = new OpenAI({ apiKey });
const response = await openai.chat.completions.create({...});
```

### Pros:
- ✅ **Fast** - Direct API calls, no proof generation overhead
- ✅ **Simple** - Standard OpenAI SDK usage
- ✅ **Reliable** - Mature, well-tested SDK

### Cons:
- ❌ **No Proof** - Cannot cryptographically verify the score came from OpenAI
- ❌ **Trust Required** - Verifiers must trust the operator didn't tamper with results
- ❌ **Less Secure** - No way to prove API key was actually used

### Use when:
- Testing/development
- Speed is critical
- Operating in trusted environment
- ZK proofs not required for your use case

---

## Version 2: zkFetch (ZK Proofs) 🔐
**File:** `openaiAnalyzerZkFetch.ts`
**Speed:** ~5-7 seconds (includes proof generation)
**Proof:** Cryptographic ZK proof via Reclaim Protocol

### How it works:
```typescript
import { ReclaimClient } from "@reclaimprotocol/zk-fetch";
const client = new ReclaimClient(appId, appSecret);
const proof = await client.zkFetch(
  'https://api.openai.com/v1/chat/completions',
  publicOptions,   // visible: domain, prompt
  privateOptions   // hidden: API key
);
```

### Pros:
- ✅ **Cryptographically Verifiable** - ZK proof that OpenAI API was actually called
- ✅ **Privacy-Preserving** - API key stays hidden in proof
- ✅ **Trustless** - Verifiers can independently verify without trusting operator
- ✅ **Immutable** - Proof stored on IPFS can't be tampered with
- ✅ **On-chain Compatible** - Proof can be verified on-chain via smart contracts

### Cons:
- ❌ **Slower** - ~5 seconds added for proof generation
- ❌ **More Complex** - Requires Reclaim Protocol APP_ID and APP_SECRET
- ❌ **Network Dependent** - Relies on Reclaim Protocol witness network

### Use when:
- **Production deployments** with high security requirements
- **Multi-operator AVS** where proof of execution is critical
- **On-chain verification** needed for governance/disputes
- **Regulatory compliance** requires audit trails

---

## Configuration

### Switch Between Versions

Edit `.env`:
```bash
# Use direct OpenAI SDK (fast, no proofs)
USE_ZKFETCH=false

# Use zkFetch with ZK proofs (slower, verifiable)
USE_ZKFETCH=true
```

### Required Environment Variables

**For both versions:**
```bash
OPENAI_API_KEY=sk-proj-...
```

**For zkFetch version only:**
```bash
APP_ID=0xYourAppId...
APP_SECRET=0xYourAppSecret...
```

Get APP_ID and APP_SECRET from: https://dev.reclaimprotocol.org/

---

## Output Comparison

### OpenAI SDK Output:
```json
{
  "score": 85,
  "confidence": 92,
  "reasoning": "Premium short domain with strong brandability..."
}
```

### zkFetch Output:
```json
{
  "score": 85,
  "confidence": 92,
  "reasoning": "Premium short domain with strong brandability...",
  "zkProof": {
    "claimData": {...},
    "signatures": ["0x..."],
    "witnesses": [...]
  },
  "extractedValues": {...}
}
```

The zkFetch version includes full cryptographic proof that can be verified by third parties.

---

## Verification

### Verify zkFetch Proof

```typescript
import { Reclaim } from '@reclaimprotocol/js-sdk';

const isValid = await Reclaim.verifySignedProof(proof);
console.log('Proof valid:', isValid);
```

### Transform for On-chain Verification

```typescript
const onchainProof = Reclaim.transformForOnchain(proof);
// Submit to smart contract for verification
```

---

## Recommendation

**For DomaLend AVS:**

- **Development/Testing:** Use `USE_ZKFETCH=false` for faster iteration
- **Production/Mainnet:** Use `USE_ZKFETCH=true` for trustless verification
- **Multi-operator Setup:** **Must use** `USE_ZKFETCH=true` to prevent malicious operators

**Security Model:**

| Scenario | Recommended | Reason |
|----------|------------|---------|
| Single trusted operator | Either | Trust model already established |
| Multiple operators | zkFetch | Need proof each operator executed correctly |
| On-chain disputes | zkFetch | Proof can be verified in smart contract |
| Regulatory audit | zkFetch | Immutable proof trail on IPFS |
| Development/testing | OpenAI SDK | Faster, simpler debugging |

---

## Performance Benchmarks

| Method | Average Time | Gas Cost (est.) | Verifiability |
|--------|--------------|-----------------|---------------|
| OpenAI SDK | 1-2s | N/A | Trust-based |
| zkFetch | 5-7s | ~50k gas* | Cryptographic |

*Gas cost if proof is verified on-chain via smart contract

---

## Implementation Notes

Both versions:
1. Resolve tokenId → domain name from NFT contract
2. Score domain with OpenAI GPT-4o-mini
3. Upload results to IPFS via Pinata
4. Submit score through ServiceManager

The only difference is zkFetch adds cryptographic proof generation between steps 2 and 3.

---

## Future Enhancements

- [ ] On-chain proof verification in ServiceManager
- [ ] Multi-operator consensus with proof aggregation
- [ ] Dispute resolution using stored proofs
- [ ] Proof caching to avoid re-scoring same domains
- [ ] Batch proof generation for multiple domains

---

## Questions?

See:
- [zkFetch Documentation](https://gitlab.reclaimprotocol.org/integrations/zkfetch)
- [Reclaim Protocol](https://reclaimprotocol.org)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
