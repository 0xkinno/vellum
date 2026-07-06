// Real on-chain wiring for Vellum: publish, decrypt, claim, disperse, revoke, faucets, reads.
import { readContract, writeContract, waitForTransactionReceipt, signTypedData } from "@wagmi/core";
import { bytesToHex, createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";
import { wagmiConfig } from "./wallet";
import { getFheInstance } from "./fhe";
import distributorAbi from "../abi/VellumDistributor.json";
import tokenAbi from "../abi/VellumToken.json";

export const DISTRIBUTOR = import.meta.env.VITE_VELLUM_DISTRIBUTOR;
export const VLM = import.meta.env.VITE_VELLUM_TOKEN;
export const USD = import.meta.env.VITE_USD;
export const CUSD = import.meta.env.VITE_CUSD;
export const ETHERSCAN = "https://sepolia.etherscan.io";
const ZERO32 = "0x" + "0".repeat(64);
export const KIND = { Airdrop: 0, Vesting: 1, Disperse: 2 };

const wait = (hash) => waitForTransactionReceipt(wagmiConfig, { hash });

// write with a small retry — smooths transient RPC gas-estimation hiccups.
async function write(params, tries = 2) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await writeContract(wagmiConfig, params);
    } catch (e) {
      last = e;
      const msg = (e && (e.message || e.shortMessage)) || "";
      if (i < tries - 1 && /gasLimit|intermediate value|network|timeout|fetch|-32603/i.test(msg)) {
        await new Promise((r) => setTimeout(r, 900));
        continue;
      }
      throw e;
    }
  }
  throw last;
}
const send = async (params) => { const h = await write(params); await wait(h); return h; };

const metaAbi = [
  { name: "name", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "symbol", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { name: "decimals", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
];
const erc20MockAbi = [
  ...metaAbi,
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
];

const usdAbi = [
  { name: "mint", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
  { name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
];
const wrapperAbi = [
  { name: "wrap", type: "function", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bytes32" }] },
  { name: "underlying", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { name: "rate", type: "function", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
];

// Distributable confidential tokens (Sepolia). Wrappers are shielded via mint→approve→wrap;
// underlying + rate are read from the wrapper on-chain (no hardcoded pairing).
export const DIST_TOKENS = [
  { sym: "cUSD", name: "Confidential USD", address: CUSD, native: false, shieldable: true },
  { sym: "cUSDC", name: "Confidential USDC (Mock)", address: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639", native: false, shieldable: true },
  { sym: "cUSDT", name: "Confidential USDT (Mock)", address: "0x4E7B06D78965594eB5EF5414c357ca21E1554491", native: false, shieldable: true },
  { sym: "cZAMA", name: "Confidential ZAMA (Mock)", address: "0xf2D628d2598aF4eAF94CB76a437Ff86CA78FfbFB", native: false, shieldable: true },
  { sym: "VLM", name: "Vellum Token", address: VLM, native: true },
];

export const FAUCETS = [
  ["USDCMock", "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF", "cUSDCMock", 6],
  ["USDTMock", "0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0", "cUSDTMock", 6],
  ["WETHMock", "0xff54739b16576FA5402F211D0b938469Ab9A5f3F", "cWETHMock", 18],
  ["ZAMAMock", "0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57", "cZAMAMock", 18],
  ["tGBPMock", "0x93c931278A2aad1916783F952f94276eA5111442", "ctGBPMock", 18],
  ["BRONMock", "0xFf021fB13cA64e5354c62c954b949a88cfDEb25E", "cBRONMock", 18],
];

const mainnetClient = createPublicClient({ chain: mainnet, transport: http() });

/* ---------------- reads ---------------- */

export async function tokenMeta(address) {
  try {
    const [name, symbol] = await Promise.all([
      readContract(wagmiConfig, { address, abi: metaAbi, functionName: "name" }),
      readContract(wagmiConfig, { address, abi: metaAbi, functionName: "symbol" }),
    ]);
    return { name, symbol };
  } catch {
    return null;
  }
}

export async function ensName(address) {
  try {
    return await mainnetClient.getEnsName({ address });
  } catch {
    return null;
  }
}

export async function latestCampaignId() {
  const c = await readContract(wagmiConfig, { address: DISTRIBUTOR, abi: distributorAbi, functionName: "campaignCount" });
  return Number(c);
}

export async function getCampaign(id) {
  const c = await readContract(wagmiConfig, { address: DISTRIBUTOR, abi: distributorAbi, functionName: "campaigns", args: [BigInt(id)] });
  return { operator: c[0], token: c[1], kind: Number(c[2]), start: Number(c[3]), cliff: Number(c[4]), duration: Number(c[5]), end: Number(c[6]), title: c[7], recipientCount: Number(c[8]) };
}

export async function listCampaigns() {
  const n = await latestCampaignId();
  const out = [];
  for (let i = 1; i <= n; i++) out.push({ id: i, ...(await getCampaign(i)) });
  return out.reverse();
}

// Client-side mirror of the on-chain vesting math (public schedule, sealed value).
export function vestedNow(alloc, camp, nowSec = Math.floor(Date.now() / 1000)) {
  if (!camp || camp.duration === 0) return alloc;
  const startCliff = camp.start + camp.cliff;
  if (nowSec < startCliff) return 0n;
  const elapsed = nowSec - camp.start;
  if (elapsed >= camp.duration) return alloc;
  const bps = BigInt(Math.floor((elapsed * 10000) / camp.duration));
  return (alloc * bps) / 10000n;
}

/* ---------------- operator: publish / disperse / revoke ---------------- */

export async function publishDistribution({ kind, title, rows, operator, tokenAddress, native, onStep }) {
  const step = (s) => onStep && onStep(s);
  const recipients = rows.map((r) => r.addr);
  const amounts = rows.map((r) => BigInt(r.amt));
  const total = amounts.reduce((a, b) => a + b, 0n);
  const kindId = KIND[kind] ?? 0;
  const now = Math.floor(Date.now() / 1000);
  const isVesting = kindId === 1;
  const start = isVesting ? BigInt(now) : 0n;
  const duration = isVesting ? 300n : 0n; // 5-min linear vest for the demo

  if (native) {
    step("Minting demo funds…");
    await send({ address: tokenAddress, abi: tokenAbi, functionName: "mint", args: [operator, 1_000_000n] });
  }

  step("Approving distributor…");
  const until = BigInt(now + 365 * 24 * 3600);
  await send({ address: tokenAddress, abi: tokenAbi, functionName: "setOperator", args: [DISTRIBUTOR, until] });

  step("Creating campaign…");
  await send({ address: DISTRIBUTOR, abi: distributorAbi, functionName: "createCampaign", args: [tokenAddress, kindId, start, 0n, duration, 0n, title] });
  const id = await readContract(wagmiConfig, { address: DISTRIBUTOR, abi: distributorAbi, functionName: "campaignCount" });

  const instance = await getFheInstance();

  step("Encrypting + funding…");
  const fenc = instance.createEncryptedInput(DISTRIBUTOR, operator);
  fenc.add64(total);
  const f = await fenc.encrypt();
  await send({ address: DISTRIBUTOR, abi: distributorAbi, functionName: "fund", args: [id, bytesToHex(f.handles[0]), bytesToHex(f.inputProof)] });

  step("Sealing allocations…");
  const aenc = instance.createEncryptedInput(DISTRIBUTOR, operator);
  amounts.forEach((a) => aenc.add64(a));
  const a = await aenc.encrypt();
  await send({ address: DISTRIBUTOR, abi: distributorAbi, functionName: "setAllocations", args: [id, recipients, a.handles.map(bytesToHex), bytesToHex(a.inputProof)] });

  return { id: Number(id), total };
}

export async function distributeAll(id, recipients) {
  return send({ address: DISTRIBUTOR, abi: distributorAbi, functionName: "distribute", args: [BigInt(id), recipients] });
}

export async function revokeRecipients(id, addrs) {
  return send({ address: DISTRIBUTOR, abi: distributorAbi, functionName: "revoke", args: [BigInt(id), addrs] });
}

/* ---------------- recipient: decrypt + claim ---------------- */

export async function getMine(id, recipient) {
  const camp = await getCampaign(id);
  const [allocH, claimedH] = await Promise.all([
    readContract(wagmiConfig, { address: DISTRIBUTOR, abi: distributorAbi, functionName: "getAllocation", args: [BigInt(id), recipient] }),
    readContract(wagmiConfig, { address: DISTRIBUTOR, abi: distributorAbi, functionName: "getClaimed", args: [BigInt(id), recipient] }),
  ]);
  const pairs = [];
  if (allocH && allocH !== ZERO32) pairs.push({ handle: allocH, contractAddress: DISTRIBUTOR });
  if (claimedH && claimedH !== ZERO32) pairs.push({ handle: claimedH, contractAddress: DISTRIBUTOR });
  if (!pairs.length) return { allocation: 0n, claimed: 0n, camp };

  const instance = await getFheInstance();
  const kp = instance.generateKeypair();
  const start = Math.floor(Date.now() / 1000);
  const days = 7;
  const eip712 = instance.createEIP712(kp.publicKey, [DISTRIBUTOR], start, days);
  const signature = await signTypedData(wagmiConfig, {
    domain: eip712.domain,
    types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message,
  });
  const res = await instance.userDecrypt(
    pairs, kp.privateKey, kp.publicKey, signature.replace(/^0x/, ""),
    [DISTRIBUTOR], recipient, start, days,
  );
  const allocation = allocH && allocH !== ZERO32 ? BigInt(res[allocH]) : 0n;
  const claimed = claimedH && claimedH !== ZERO32 ? BigInt(res[claimedH]) : 0n;
  return { allocation, claimed, camp };
}

export async function claimAllocation(id) {
  return send({ address: DISTRIBUTOR, abi: distributorAbi, functionName: "claim", args: [BigInt(id)] });
}

/* ---------------- faucets ---------------- */

export async function getVlm(to) {
  return send({ address: VLM, abi: tokenAbi, functionName: "mint", args: [to, 1_000_000n] });
}

/** Shield any registry wrapper: read its underlying + rate on-chain, then mint → approve → wrap.
 *  Ends with `confUnits` confidential units in `to`'s balance. */
export async function shieldToken(wrapper, to, confUnits = 1_000_000n) {
  const [underlying, rate] = await Promise.all([
    readContract(wagmiConfig, { address: wrapper, abi: wrapperAbi, functionName: "underlying" }),
    readContract(wagmiConfig, { address: wrapper, abi: wrapperAbi, functionName: "rate" }),
  ]);
  const amt = confUnits * rate;
  await send({ address: underlying, abi: usdAbi, functionName: "mint", args: [to, amt] });
  await send({ address: underlying, abi: usdAbi, functionName: "approve", args: [wrapper, amt] });
  return send({ address: wrapper, abi: wrapperAbi, functionName: "wrap", args: [to, amt] });
}

export async function mintUnderlying(erc20, to, decimals = 18) {
  const amt = 1_000_000n * 10n ** BigInt(decimals);
  return send({ address: erc20, abi: erc20MockAbi, functionName: "mint", args: [to, amt] });
}