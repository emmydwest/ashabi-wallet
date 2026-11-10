import 'server-only';
import { Account, JsonRpcProvider, teraToGas } from 'near-api-js';
import { AGENT_ID, CONTRACT_ID, RPC_URL } from '@/lib/config';

// A function-call key that can only call request_payment on the guardian contract,
// with a fixed gas allowance. Even if this server leaked it, it could not move funds.
function agentAccount() {
  const key = process.env.AGENT_WEB_PRIVATE_KEY?.trim();
  if (!key) throw new Error('The agent key is not configured on this deployment.');
  return new Account(AGENT_ID, new JsonRpcProvider({ url: RPC_URL }), key as never);
}

export const agentConfigured = () => Boolean(process.env.AGENT_WEB_PRIVATE_KEY?.trim());

export type RequestOutcome = { status: string; request_id: string; record_id: number | null; reason: string };
export type CallResult = { txHash?: string; outcome?: RequestOutcome; error?: string };

export async function requestPayment(args: {
  request_id: string;
  receiver_id: string;
  amount: string;
  memo: string;
}): Promise<CallResult> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = (await agentAccount().callFunctionRaw({
        contractId: CONTRACT_ID,
        methodName: 'request_payment',
        args,
        gas: teraToGas(50),
        deposit: 0n,
      })) as {
        transaction?: { hash: string };
        transaction_outcome?: { id: string };
        status?: { SuccessValue?: string; Failure?: unknown };
      };
      const txHash = result.transaction?.hash ?? result.transaction_outcome?.id;
      if (result.status?.Failure) return { txHash, error: JSON.stringify(result.status.Failure).slice(0, 200) };
      const raw = result.status?.SuccessValue ? Buffer.from(result.status.SuccessValue, 'base64').toString() : '';
      return { txHash, outcome: raw ? JSON.parse(raw) : undefined };
    } catch (e) {
      const message = String((e as Error).message ?? e);
      // Two runs at once can race for the key's nonce; one retry settles it.
      if (attempt === 0 && /nonce/i.test(message)) continue;
      const panic = message.match(/Smart contract panicked: ([^"\\]+)/);
      return { error: panic ? panic[1] : message.slice(0, 200) };
    }
  }
  return { error: 'could not send the transaction' };
}
