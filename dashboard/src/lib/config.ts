export const NETWORK = 'testnet';
export const RPC_URL = process.env.NEXT_PUBLIC_NEAR_RPC ?? 'https://rpc.testnet.near.org';
export const EXPLORER = 'https://testnet.nearblocks.io';
export const CONTRACT_ID = process.env.NEXT_PUBLIC_GUARDIAN_CONTRACT ?? 'guardian.gw-emmy.testnet';
export const AGENT_ID = 'gw-emmy-agent.testnet';
export const VENDOR_ID = 'api-vendor.gw-emmy.testnet';
/** A second provider with its own account and catalog, wrapping free public data APIs. */
export const OPEN_DATA_ID = 'opendata.gw-emmy.testnet';
/** Creates a wallet per user; each runs the vault contract code as a global contract. */
export const FACTORY_ID = process.env.NEXT_PUBLIC_GUARDIAN_FACTORY ?? 'factory.gw-emmy.testnet';
export const FAUCET_URL = 'https://near-faucet.io/';

/** Owns the sandbox wallets below; a box-held account, never a visitor. */
export const SANDBOX_OWNER = 'ashabi-sandbox.testnet';
/** Open attack challenge: a factory wallet of its own, so the demo wallet's kill-switch is untouched. */
export const CHALLENGE_VAULT = `challenge.${FACTORY_ID}`;
/** Pre-made sandbox wallets that /try hands out, one per visitor for a day. */
export const TRIAL_VAULTS = Array.from({ length: 16 }, (_, i) => `try-${String(i + 1).padStart(2, '0')}.${FACTORY_ID}`);
export const isSandboxVault = (id: string) => id === CHALLENGE_VAULT || TRIAL_VAULTS.includes(id);

const SUB_ACCOUNT = /^[a-z\d]+([-_][a-z\d]+)*$/;

/** The demo wallet, or a wallet the factory created. Nothing else is read or paid through. */
export function isVaultId(id: string) {
  if (id === CONTRACT_ID) return true;
  const suffix = `.${FACTORY_ID}`;
  return id.endsWith(suffix) && SUB_ACCOUNT.test(id.slice(0, -suffix.length));
}

export const txUrl = (hash: string) => `${EXPLORER}/txns/${hash}`;
export const accountUrl = (id: string) => `${EXPLORER}/address/${id}`;

export const REPO_URL = 'https://github.com/emmydwest/ashabi-wallet';
