# Vellum — going live

Wires the simulated preview (`Vellum.jsx`) to real Sepolia transactions. Every place
in the UI that simulates the chain is marked `// ⟶ LIVE` with the call below.

## Stack
- **Frontend:** Next.js (App Router) or Vite + React, wagmi + viem, `@tanstack/react-query`
- **Confidential money movement:** `@tokenops/sdk` (audited airdrop / vesting / disperse)
- **FHE encrypt / decrypt:** Zama relayer (`@zama-fhe/sdk`, `@zama-fhe/react-sdk`)
- **Own contract (Builder Track):** `VellumDistributor.sol` (ERC-7984 + FHEVM)

## Install
```bash
pnpm add @tokenops/sdk @zama-fhe/sdk @zama-fhe/react-sdk \
         @tanstack/react-query wagmi viem
```

## 1 · Clients (once)
```ts
import { createPublicClient, createWalletClient, custom, http } from "viem";
import { sepolia } from "viem/chains";
import { createSepoliaEncryptorWeb } from "@tokenops/sdk/fhe";
import { createConfidentialAirdropFactoryClient } from "@tokenops/sdk/fhe-airdrop";

const publicClient = createPublicClient({ chain: sepolia, transport: http(RPC_URL) });
const walletClient = createWalletClient({ chain: sepolia, transport: custom(window.ethereum) });

// Browser encryptor (runs WASM in a worker). Reuse it across calls.
const encryptor = await createSepoliaEncryptorWeb({ publicClient, walletClient });
```

## 2 · Operator: compose → seal → publish  → `Create` view (`seal()`)
```ts
const factory = createConfidentialAirdropFactoryClient({ publicClient, walletClient });

// Deploy + fund a campaign clone (one call).
const { airdrop } = await factory.createAndFundConfidentialAirdrop({
  token: ERC7984_TOKEN,          // confidential token address
  endTime, canExtend: true,      // claim window is public
});

// For each recipient: encrypt the amount and admin-sign the EIP-712 claim.
for (const { addr, amt } of rows) {
  const enc = await encryptor.encryptUint64(amt, airdrop.address, operatorAddress);
  await airdrop.signClaimAuthorization({ recipient: addr, encryptedAmount: enc.handle });
  // store { addr, handle: enc.handle, signature } off-chain for recipients to pull
}
```
Public sees a per-recipient handle; you (operator) hold the roster + totals.

## 3 · Recipient: decrypt → claim  → `Claim` view (`decrypt()` / claim button)
```ts
// a) Persistent decrypt ACL — must run BEFORE claim, while the signature is unused.
await airdrop.getClaimAmount({ recipient, encryptedAmount: handle, signature });

// b) User-decryption (EIP-712) — reveals ONLY this recipient's number.
import { ZamaSDK } from "@zama-fhe/sdk";
import { FhevmType } from "@fhevm/hardhat-plugin";
const clear = await zama.userDecryptEuint(
  FhevmType.euint64, handle, airdrop.address, signer,
);   // -> the gold count-up in the UI

// c) Claim — moves a ciphertext into the recipient's confidential balance.
await airdrop.claim({ recipient, encryptedAmount: handle, signature });
```

## 4 · Registry + faucet  → `Registry` view
```ts
const { confidentialTokenAddress } =
  await sdk.registry.getConfidentialToken(UNDERLYING_ERC20);   // ERC-20 → ERC-7984
// faucet "Mint 1M" calls the underlying mock's public mint(to, 1_000_000e<dec>)
```

## 5 · Own contract path (Builder Track)  → `VellumDistributor.sol`
```bash
npx hardhat compile
npx hardhat deploy --network sepolia        # FHEVM Hardhat template
```
```ts
const enc = await fhevm.createEncryptedInput(distributor, operator)
  .add64(204512).add64(98000)/* … */.encrypt();
await distributor.allocate(recipients, enc.handles, enc.inputProof);
// recipient: getAllocation(me) → userDecryptEuint(euint64, ...) → claim()
```

## Map: UI marker → call
| `Vellum.jsx` marker | Real call |
| --- | --- |
| `Create` › `seal()` | `factory.createAndFundConfidentialAirdrop` + `encryptUint64` + `signClaimAuthorization` |
| `Claim` › `decrypt()` | `airdrop.getClaimAmount` → `zama.userDecryptEuint(euint64, …)` |
| `Claim` › claim button | `airdrop.claim` |
| `Registry` › Mint | underlying mock `mint(to, amount)` |

## Demo checklist (Builder + Special Bounty)
- [ ] Fill READMEs with deployed addresses (distributor + token)
- [ ] Deploy frontend (Vercel); proxy the Zama relayer key server-side
- [ ] Send 0.05 Sepolia ETH to the demo wallet (Google Cloud / Alchemy faucet)
- [ ] Record the 3-min **real-person** pitch (no AI voice — rule)
- [ ] Publish the X thread, tag `@zama`, `#ZamaDeveloperProgram`
- [ ] Submit Builder Track + Special Bounty × TokenOps forms
