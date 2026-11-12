export const NETWORK = 'testnet';
export const RPC_URL = process.env.NEXT_PUBLIC_NEAR_RPC ?? 'https://rpc.testnet.near.org';
export const EXPLORER = 'https://testnet.nearblocks.io';
export const CONTRACT_ID = process.env.NEXT_PUBLIC_GUARDIAN_CONTRACT ?? 'guardian.gw-emmy.testnet';
export const AGENT_ID = 'gw-emmy-agent.testnet';
export const VENDOR_ID = 'api-vendor.gw-emmy.testnet';
/** Creates a wallet per user; each runs the vault contract code as a global contract. */
export const FACTORY_ID = process.env.NEXT_PUBLIC_GUARDIAN_FACTORY ?? 'factory.gw-emmy.testnet';
export const FAUCET_URL = 'https://near-faucet.io/';

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
