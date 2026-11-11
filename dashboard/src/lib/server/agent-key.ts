import 'server-only';
import { accountSigner, GuardianAgent } from '@guardian-wallet/sdk';
import { Account, JsonRpcProvider } from 'near-api-js';
import { AGENT_ID, CONTRACT_ID, FACTORY_ID, isVaultId, RPC_URL } from '@/lib/config';
import { viewCall } from '@/lib/near';

// Function-call keys that can only call request_payment on one guardian wallet, with a fixed
// gas allowance. Even if this server leaked them, they could not move funds.
//  - AGENT_WEB_PRIVATE_KEY: the demo agent on guardian.gw-emmy.testnet.
//  - HOSTED_AGENT_PRIVATE_KEY: the hosted assistant. The factory puts its public key on the
//    agent account next to every wallet it creates, scoped to that wallet.
export const agentConfigured = () => Boolean(process.env.AGENT_WEB_PRIVATE_KEY?.trim());
export const hostedAgentConfigured = () => Boolean(process.env.HOSTED_AGENT_PRIVATE_KEY?.trim());

const RPCS = [RPC_URL, 'https://test.rpc.fastnear.com'];
const agents = new Map<string, GuardianAgent>();

function build(contractId: string, agentId: string, key: string) {
  const account = new Account(agentId, new JsonRpcProvider({ url: RPC_URL }), key.trim() as never);
  return new GuardianAgent({ contractId, agentId, signer: accountSigner(account), rpcUrls: RPCS });
}

export function guardianAgent() {
  if (!agentConfigured()) throw new Error('The agent key is not configured on this deployment.');
  let agent = agents.get(CONTRACT_ID);
  if (!agent) agents.set(CONTRACT_ID, (agent = build(CONTRACT_ID, AGENT_ID, process.env.AGENT_WEB_PRIVATE_KEY!)));
  return agent;
}

type VaultInfo = { vault_id: string; agent_id: string; owner_id: string; state: string };

/** The agent for a wallet: the demo agent, or the hosted assistant on a factory wallet. */
export async function agentFor(vaultId: string): Promise<GuardianAgent> {
  if (vaultId === CONTRACT_ID) return guardianAgent();
  if (!isVaultId(vaultId)) throw new Error(`${vaultId} is not a guardian wallet`);
  const cached = agents.get(vaultId);
  if (cached) return cached;
  if (!hostedAgentConfigured()) throw new Error('The hosted assistant is not configured on this deployment.');
  const info = await viewCall<VaultInfo | null>('get_vault', { vault_id: vaultId }, FACTORY_ID);
  if (!info) throw new Error(`${vaultId} was not created by ${FACTORY_ID}`);
  if (info.state !== 'READY') throw new Error(`${vaultId} has no assistant key yet`);
  // The owner may have rotated the agent with set_agent; the wallet's own answer wins.
  const { agent_id } = await viewCall<{ agent_id: string }>('get_wallet_status', {}, vaultId);
  if (agent_id !== info.agent_id) throw new Error(`${vaultId} now uses its own agent, not this assistant`);
  const agent = build(vaultId, agent_id, process.env.HOSTED_AGENT_PRIVATE_KEY!);
  agents.set(vaultId, agent);
  return agent;
}
