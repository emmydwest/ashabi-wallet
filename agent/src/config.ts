export const CFG = {
  network: 'testnet',
  rpc: process.env.NEAR_RPC ?? 'https://rpc.testnet.near.org',
  explorer: 'https://testnet.nearblocks.io',
  contract: process.env.GUARDIAN_CONTRACT ?? 'guardian.gw-emmy.testnet',
  owner: process.env.GUARDIAN_OWNER ?? 'gw-emmy-owner.testnet',
  agent: process.env.GUARDIAN_AGENT ?? 'gw-emmy-agent.testnet',
  // Function-call key limited to request_payment on the guardian contract.
  agentPublicKey: process.env.GUARDIAN_AGENT_PUBKEY ?? 'ed25519:uQGVJnq7rQY2ixMqVcFtePsVFKucFYnUKMLupfq5Z3Z',
  vendor: process.env.GUARDIAN_VENDOR ?? 'api-vendor.gw-emmy.testnet',
  attacker: 'attacker.gw-emmy.testnet',
  vendorUrl: process.env.VENDOR_URL ?? 'http://localhost:8787',
  credentialsDir: process.env.NEAR_CREDENTIALS_DIR ?? `${process.env.HOME}/.near-credentials`,
};
export const txUrl = (h: string) => `${CFG.explorer}/txns/${h}`;
