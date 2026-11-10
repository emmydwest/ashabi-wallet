export const NETWORK = 'testnet';
export const RPC_URL = process.env.NEXT_PUBLIC_NEAR_RPC ?? 'https://rpc.testnet.near.org';
export const EXPLORER = 'https://testnet.nearblocks.io';
export const CONTRACT_ID = process.env.NEXT_PUBLIC_GUARDIAN_CONTRACT ?? 'guardian.gw-emmy.testnet';
export const AGENT_ID = 'gw-emmy-agent.testnet';
export const VENDOR_ID = 'api-vendor.gw-emmy.testnet';

export const txUrl = (hash: string) => `${EXPLORER}/txns/${hash}`;
export const accountUrl = (id: string) => `${EXPLORER}/address/${id}`;
