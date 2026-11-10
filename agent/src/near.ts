import { readFileSync, existsSync } from 'node:fs';
import { Account, JsonRpcProvider, teraToGas } from 'near-api-js';
import { CFG } from './config.ts';

export const provider = new JsonRpcProvider({ url: CFG.rpc });

function keyFor(accountId: string, publicKey?: string): string {
  const dir = `${CFG.credentialsDir}/${CFG.network}`;
  const file = publicKey ? `${dir}/${accountId}/${publicKey.replace(':', '_')}.json` : `${dir}/${accountId}.json`;
  if (!existsSync(file))
    throw new Error(`no key file for ${accountId}${publicKey ? ' (' + publicKey.slice(0, 16) + '…)' : ''}`);
  return JSON.parse(readFileSync(file, 'utf8')).private_key;
}

export const agentAccount = () => new Account(CFG.agent, provider, keyFor(CFG.agent, CFG.agentPublicKey) as any);
export const ownerAccount = () => new Account(CFG.owner, provider, keyFor(CFG.owner) as any);

export async function view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
  return (await provider.callFunction({ contractId: CFG.contract, method, args })) as T;
}

export type TxResult<T> = { txHash: string; ok: boolean; value?: T; error?: string };

export async function call<T>(
  acct: Account,
  method: string,
  args: Record<string, unknown>,
  deposit = 0n,
  tgas = 50,
): Promise<TxResult<T>> {
  try {
    const r: any = await acct.callFunctionRaw({
      contractId: CFG.contract,
      methodName: method,
      args,
      gas: teraToGas(tgas),
      deposit,
    });
    const txHash = r.transaction?.hash ?? r.transaction_outcome?.id;
    const s = r.status ?? {};
    if (s.Failure) return { txHash, ok: false, error: JSON.stringify(s.Failure) };
    const raw = s.SuccessValue ? Buffer.from(s.SuccessValue, 'base64').toString() : '';
    return { txHash, ok: true, value: raw ? JSON.parse(raw) : undefined };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    const m = msg.match(/Smart contract panicked: ([^"\\]+)/);
    return { txHash: e?.context?.transactionHash ?? '', ok: false, error: m ? m[1] : msg.slice(0, 200) };
  }
}

export type PaymentRecord = {
  id: number;
  request_id: string;
  receiver_id: string;
  amount: string;
  memo: string;
  status: string;
  approved_by_owner: boolean;
};

export async function waitForPayment(
  id: number,
  want: string[],
  timeoutMs = 60_000,
  everyMs = 2000,
): Promise<PaymentRecord | null> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const r = await view<PaymentRecord | null>('get_payment', { record_id: id });
    if (r && want.includes(r.status)) return r;
    await new Promise((res) => setTimeout(res, everyMs));
  }
  return view<PaymentRecord | null>('get_payment', { record_id: id });
}

export const YOCTO = 10n ** 24n;
export function nearToYoctoStr(n: string | number): string {
  const [w, f = ''] = String(n).split('.');
  return (BigInt(w || '0') * YOCTO + BigInt((f + '0'.repeat(24)).slice(0, 24))).toString();
}
export const yoctoToNearStr = (y: string) => (Number(BigInt(y) / 10n ** 18n) / 1e6).toString();
