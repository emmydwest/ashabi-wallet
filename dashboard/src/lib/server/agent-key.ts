import 'server-only';
import { accountSigner, GuardianAgent } from '@guardian-wallet/sdk';
import { Account, JsonRpcProvider } from 'near-api-js';
import { AGENT_ID, CONTRACT_ID, RPC_URL } from '@/lib/config';

// A function-call key that can only call request_payment on the guardian contract,
// with a fixed gas allowance. Even if this server leaked it, it could not move funds.
export const agentConfigured = () => Boolean(process.env.AGENT_WEB_PRIVATE_KEY?.trim());

let agent: GuardianAgent | undefined;

export function guardianAgent() {
  if (!agentConfigured()) throw new Error('The agent key is not configured on this deployment.');
  agent ??= new GuardianAgent({
    contractId: CONTRACT_ID,
    agentId: AGENT_ID,
    signer: accountSigner(
      new Account(AGENT_ID, new JsonRpcProvider({ url: RPC_URL }), process.env.AGENT_WEB_PRIVATE_KEY!.trim() as never),
    ),
    rpcUrls: [RPC_URL, 'https://test.rpc.fastnear.com'],
  });
  return agent;
}
