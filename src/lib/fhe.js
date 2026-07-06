// Zama relayer SDK served from /public (window.relayerSDK).
// Its WASM loads from the app origin root (/tfhe_bg.wasm, /kms_lib_bg.wasm) — also in /public.
let instancePromise = null;

async function waitForSDK(ms = 10000) {
  const start = Date.now();
  while (!window.relayerSDK) {
    if (Date.now() - start > ms) throw new Error("Zama relayer SDK didn't load — is public/relayer-sdk.umd.js present?");
    await new Promise((r) => setTimeout(r, 50));
  }
  return window.relayerSDK;
}

export function getFheInstance() {
  if (!instancePromise) {
    instancePromise = (async () => {
      const sdk = await waitForSDK();
      await sdk.initSDK(); // single-threaded; no worker file needed
      return sdk.createInstance({ ...sdk.SepoliaConfig, network: window.ethereum });
    })();
  }
  return instancePromise;
}