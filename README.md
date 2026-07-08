# VELLUM
### Confidential token distribution on the Zama Protocol - distribute in the open, seal every amount.

![Program](https://img.shields.io/badge/Zama_Developer_Program-Season_3-C7A24E?style=flat-square&labelColor=1B1813)
![Tracks](https://img.shields.io/badge/Builder_+_Special_Bounty-×_TokenOps-C7A24E?style=flat-square&labelColor=1B1813)
![Encryption](https://img.shields.io/badge/FHE-euint64-46555E?style=flat-square&labelColor=1B1813)
![Standard](https://img.shields.io/badge/Token-ERC--7984-46555E?style=flat-square&labelColor=1B1813)
![Network](https://img.shields.io/badge/Live_on-Sepolia-46555E?style=flat-square&labelColor=1B1813)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square&labelColor=1B1813)

> **Compose a distribution. The browser encrypts every amount, publishes sealed handles on-chain, and grants each recipient the right to decrypt exactly one number: their own. Public rails, private figures.**

Money is moving on-chain faster than ever, and every amount of it is public. Payroll, grants, investor rounds, and airdrops all settle on a ledger that broadcasts the figure to anyone who looks: competitors read your cap table, recipients see each other's slices, and the number becomes a vector for targeting and coercion. VELLUM keeps the settlement public and verifiable, and seals the amount with fully homomorphic encryption, so the chain proves *that* you paid, never *how much*.

This is the primitive every token organisation needs and almost none have: not a wrapper, not a one-off, but a distribution rail where confidentiality is the default and only the recipient holds the key to their own line.

---

## Live Resources

| Resource | Where |
|---|---|
| **Live app** | https://vellum-delta-plum.vercel.app/ |
| **VellumDistributor** (multi-campaign engine) | Sepolia `0x96D6D31891C91eb57b144c86b87c957F31BFceb2` |
| **VellumToken** (ERC-7984 demo token + faucet) | Sepolia `0x2f0Aed55D754fbD6bf34fAbdc28a474ad0718722` |
| **VellumcUSD** (OpenZeppelin ERC-7984 wrapper) | Sepolia `0xce022cd101a29f635aC25693dCC7093E335B0519` |
| **MockUSD** (underlying ERC-20) | Sepolia `0xa3481929f02f443e9525f857952e7842B90317Cb` |
| **Network** | Ethereum Sepolia (FHEVM coprocessor + Zama relayer) |

> Everything is live. Amounts are encrypted in the browser via the Zama relayer SDK, published as sealed handles, decrypted only by their owners, and claimed as real ERC-7984 transfers on Sepolia.

---

## The Problem

Three things are broken in how value moves on a public ledger.

1. **Public chains leak the amount, not just the transfer.** A salary, a grant, an investor allocation: the figure is the sensitive part, and it is sitting in plain sight next to the recipient's address.
2. **Wrapping a token is not distributing it.** Shield/unshield tooling makes a balance private *after* it lands. It does nothing for the moment that exposes the most: the payout itself, where amounts and recipient lists are written together.
3. **"Private" usually means trust-me.** Off-chain spreadsheets and custodial dashboards hide the number from the public by handing it to an operator. That is secrecy, not confidentiality.

VELLUM removes all three: the amount is encrypted *before* it is published, the distribution itself is the confidential step, and no custodian ever holds plaintext.

---

## The Solution

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                VELLUM PIPELINE                                 │
├──────────┬──────────┬──────────┬──────────┬───────────────┬───────────────────┤
│ COMPOSE  │ ENCRYPT  │ PUBLISH  │  GRANT   │   DECRYPT     │      CLAIM         │
├──────────┼──────────┼──────────┼──────────┼───────────────┼───────────────────┤
│ operator │ each amt │ write    │ per-     │ recipient     │ ciphertext moves  │
│ adds     │ → euint64│ sealed   │ recipient│ signs EIP-712 │ into a confiden-  │
│ addrs +  │ + ZK     │ handles  │ ACL +    │ user-decrypt; │ tial ERC-7984     │
│ amounts  │ proof,   │ on-chain │ operator │ sees only     │ balance - amount  │
│ (ledger) │ in-browser│          │ ACL      │ their number  │ never revealed    │
└──────────┴──────────┴──────────┴──────────┴───────────────┴───────────────────┘
        BROWSER (relayer)    ·    FHEVM / contract    ·    KMS re-encryption
```

The decision that matters: **encryption happens client-side, before publication.** The plaintext never leaves the operator's device. What lands on-chain is already a ciphertext handle, bound by a zero-knowledge proof to the operator and the campaign, so there is no window in which the amount is readable by anyone but its owner.

---

## Three Modes, One Engine

| Mode | Delivery | On-chain behaviour |
|---|---|---|
| **Airdrop** | pull | Recipients claim their sealed allocation whenever they choose. |
| **Vesting** | pull, scheduled | Cliff + linear unlock computed on encrypted values (`FHE.mul` / `FHE.div`); recipients claim only what has vested, with a live vested-percent readout. |
| **Disperse** | push | The operator delivers every sealed amount in one call; recipients just decrypt and verify. |

One deployment of `VellumDistributor` runs unlimited campaigns across all three modes, over any ERC-7984 token.

## Shield Anything

The Create screen distributes more than a demo token. Pick a confidential wrapper (cUSD, cUSDC, cUSDT, cZAMA) and one click shields for you: mint the underlying, approve, `wrap`. VELLUM reads `underlying()` and `rate()` from each wrapper on-chain, so pairs are never guessed. cUSD is VELLUM's own pair built on OpenZeppelin's audited `ERC7984ERC20Wrapper`; the rest are Zama's official registry mocks.

---

## Architecture

```
        OPERATOR SIDE                 ON-CHAIN (Sepolia)              RECIPIENT SIDE
┌────────────────────────┐      ┌────────────────────────┐    ┌────────────────────────┐
│  Compose the ledger    │      │  VellumDistributor.sol │    │  Open Claim            │
│  addresses + amounts   │      │  ┌──────────────────┐  │    │  see a sealed handle   │
│           │            │      │  │ euint64 per      │  │    │           │            │
│           ▼            │      │  │ recipient        │  │    │           ▼            │
│  Zama relayer encrypts │      │  │ + ACL grants     │  │    │  EIP-712 user-decrypt  │
│  amt → euint64 + proof │─────►│  └──────────────────┘  │◄───│  (only your slice)     │
│           │            │ tx   │  fund() · setAlloc()   │    │           │            │
│           ▼            │      │  grants: operator      │    │           ▼            │
│  Publish (5 txs)       │      │  totals + each line    │    │  claim() →             │
│                        │      │  emit AllocationSet    │    │  confidentialTransfer  │
└────────────────────────┘      └────────────────────────┘    └────────────────────────┘
        wagmi / Reown          FHE coprocessor + KMS              EIP-712 + ERC-7984
```

### One ciphertext, three lenses

```
                          one on-chain handle  ·  euint64
                              0x9f44a9e5…c5d
                                     │
            ┌────────────────────────┼────────────────────────┐
            ▼                        ▼                        ▼
     ┌─────────────┐          ┌─────────────┐          ┌─────────────┐
     │   PUBLIC    │          │  OPERATOR   │          │  RECIPIENT  │
     │ ciphertext  │          │   totals    │          │ own amount  │
     │  0x9f44…    │          │  1,000,000  │          │   204,512   │
     └─────────────┘          └─────────────┘          └─────────────┘
       Etherscan               sealed solvency           EIP-712 decrypt
```

---

## The Settlement Flow

```
 operator wallet            VellumDistributor.sol            recipient wallet
      │                            │                                │
      │ createCampaign(...)        │                                │
      │ fund(euint64, proof)       │  _funded += amount (sealed)    │
      │ setAllocations(recipients, │  FHE.allow(amount, recipient)  │
      │   handles[], proof)        │  FHE.allow(amount, operator)   │
      │───────────────────────────►│  emit AllocationSet            │
      │                            │                                │
      │ distribute(recipients[])   │          claim()  ◄────────────│
      │  (disperse mode)           │  claimable = vested - claimed  │
      │───────────────────────────►│  FHE.select underflow guard    │
      │                            │  token.confidentialTransfer →  │
      │                            │────────────────────────────────►
      │                            │  emit Claimed / Distributed    │
      ▼                            ▼                                ▼
   one round, every amount sealed, each recipient decrypts only their own.
```

The operator's ledger is provably solvent without ever being public: `fundedOf` and `totalAllocatedOf` are sealed euint64 totals only the operator can decrypt.

---

## FHE Stack - exact usage

| Pillar | Where | What it does in VELLUM |
|---|---|---|
| **FHE coprocessor** | `VellumDistributor.sol` | Encrypted `euint64` math: `FHE.fromExternal`, `add`, `sub`, `mul`, `div`, `ge`, `select`, plus `allow` / `allowThis` / `allowTransient` ACL. |
| **Zama Relayer SDK** | `src/lib/fhe.js` | Client-side amount encryption (`createEncryptedInput`) and EIP-712 user decryption (`userDecrypt`). |
| **ERC-7984** | distributed tokens | Confidential balances, `confidentialTransfer`, `setOperator`. |
| **OZ Confidential** | `VellumcUSD.sol` | Audited `ERC7984ERC20Wrapper`: shield any ERC-20 into a confidential token. |
| **Wallets** | wagmi / Reown AppKit | Operator funds + publishes; each recipient decrypts + claims. |

---

## `VellumDistributor.sol` - contract reference

| Function | Who calls it | Effect |
|---|---|---|
| `createCampaign(token, kind, start, cliff, duration, end, title)` | operator | Open a round (Airdrop / Vesting / Disperse) over any ERC-7984 token. |
| `fund(id, extAmount, proof)` | operator | Pull encrypted funding into the campaign treasury; sealed `_funded` total. |
| `setAllocations(id, recipients[], extAmounts[], proof)` | operator | Seal a batch of allocations under one ZK input proof; per-line ACL grants. |
| `claim(id)` | recipient | Transfer `vested - claimed` (underflow-guarded `FHE.select`) into the caller's confidential balance. |
| `distribute(id, recipients[])` | operator | Push claimable amounts to a batch (disperse). |
| `revoke(id, recipients[])` / `setPaused(id, bool)` / `reclaim(id, extAmount, proof)` | operator | Cancel unclaimed lines, pause a round, sweep unclaimed funds after the window. |
| `getAllocation / getClaimed / totalAllocatedOf / fundedOf` | anyone | Sealed handles; only ACL-granted addresses can decrypt. |

| Event | Emitted when |
|---|---|
| `CampaignCreated / Funded / AllocationSet` | a round opens, is funded, or seals a line |
| `Claimed / Distributed` | value moves to a recipient (pull / push) |
| `Revoked / Reclaimed / PausedSet` | operator controls fire |

No pooled plaintext, no custody window: the contract holds ciphertexts and transfers them directly. Every amount stays encrypted from publication through claim.

---

## The Distribution Loop

1. **Shield** - one click mints, approves, and wraps the underlying into a confidential wrapper (or mint VLM directly).
2. **Compose** - the operator builds the ledger; totals run client-side.
3. **Encrypt + Publish** - each amount becomes a `euint64` handle behind one ZK proof; five transactions fund and seal the round.
4. **Decrypt** - a recipient signs the EIP-712 request and reads *only* their own number, with vested / claimed / claimable broken out live.
5. **Claim or Deliver** - pull (airdrop, vesting) or operator push (disperse); the ciphertext lands in a confidential ERC-7984 balance.

The UI surfaces each state - `composing · sealing · published` for the operator, `waiting · decrypting · revealed · claimed` for the recipient - with the seal-break, count-up, and three-lens views rendered as they happen, plus per-recipient revoke and Etherscan proof links.

---

## Project Structure

```
vellum/                            frontend (this repo)
├── public/                        Zama relayer SDK + FHE WASM (served at origin root)
├── src/
│   ├── Vellum.jsx                 Landing + app (Overview · Create · Claim · Registry)
│   ├── lib/
│   │   ├── fhe.js                 Relayer instance (initSDK · createInstance)
│   │   ├── contracts.js           Publish · decrypt · claim · disperse · revoke · shield
│   │   └── wallet.js              Reown AppKit + wagmi (Sepolia)
│   ├── abi/                       Distributor · token · wrapper ABIs
│   ├── main.jsx                   React entry (Wagmi + QueryClient providers)
│   └── index.css                  Root reset
├── index.html                     Loads the local relayer SDK bundle
├── vite.config.js
└── README.md

vellum-contracts/                  FHEVM Hardhat project (sibling repo/folder)
├── contracts/                     VellumDistributor · VellumToken · MockUSD · VellumcUSD
└── deploy/                        01_vellum.ts · 02_cusd.ts
```

---

## Run Order

```bash
# 1 · install + run the app
npm install
npm run dev            # → http://localhost:5173

# 2 · production build (verified clean)
npm run build

# 3 · contracts (in vellum-contracts, FHEVM Hardhat template)
npx hardhat compile
npx hardhat deploy --network sepolia
```

---

## Environment

| Key | Notes |
|---|---|
| `VITE_REOWN_PROJECT_ID` | Reown AppKit project id (dashboard.reown.com). |
| `VITE_SEPOLIA_RPC_URL` | Sepolia RPC (Infura / Alchemy). |
| `VITE_VELLUM_DISTRIBUTOR` | `0x96D6D31891C91eb57b144c86b87c957F31BFceb2` |
| `VITE_VELLUM_TOKEN` | `0x2f0Aed55D754fbD6bf34fAbdc28a474ad0718722` |
| `VITE_USD` | `0xa3481929f02f443e9525f857952e7842B90317Cb` |
| `VITE_CUSD` | `0xce022cd101a29f635aC25693dCC7093E335B0519` |

> The Zama testnet relayer is public; no key needed. Contract-side secrets (mnemonic, Infura key) live in Hardhat vars, never in files.

---

## Why VELLUM Excels

| Criterion | Weight | How VELLUM earns it |
|---|---|---|
| **UX / Frontend quality** | primary | A paper-white, gold-foil editorial interface with a wax-seal signature and the three-lens reveal: confidential distribution that judges *understand and feel* in the first 15 seconds. |
| **Functionality** | high | Live end to end on Sepolia: shield → seal → publish → decrypt → claim, across airdrop, vesting, and disperse, with revoke, pause, reclaim, and sealed solvency. |
| **Demo quality** | high | The seal-break is the pitch. One question - "how much did each wallet get?" - answered visibly, on the same handle, three different ways, with the Etherscan ciphertext one click away. |
| **Real-world viability** | high | Payroll, grants, investor rounds, airdrops: a primitive every token org needs, composing with the confidential-finance stack rather than forking it. |
| **Code quality** | high | An original multi-campaign FHEVM contract over audited OpenZeppelin primitives, with every chain call isolated in one module. |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Encryption | Zama FHE coprocessor · `euint64` · `FHE.fromExternal / allow / allowTransient / select` |
| Distribution | `VellumDistributor` multi-campaign engine · airdrop / vesting / disperse |
| Token | ERC-7984 confidential tokens · OpenZeppelin Confidential Contracts (`ERC7984ERC20Wrapper`) |
| Decryption | Zama Relayer SDK · EIP-712 user decryption (KMS re-encryption) |
| Chain | viem · wagmi · Reown AppKit |
| Front-end | Single-file React UI (Fraunces · Hanken Grotesk · JetBrains Mono) |
| Contract | Solidity ^0.8.27 · FHEVM Hardhat template |
| License | MIT |

---

*Built for the Zama Developer Program Mainnet Season 3 - Builder Track + Special Bounty × TokenOps, 2026.*

**Distribute in the open. Seal every amount. Each recipient holds the only key to their own line.**