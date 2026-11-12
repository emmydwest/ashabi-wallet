import { AGENT_ID, CONTRACT_ID } from './config';
import { rpc, type AccessKey } from './verify-on-chain';

// Reads the agent account's keys straight from NEAR and checks which one actually signed the
// agent's latest request_payment. Runs in the browser, so the page can't paint a result it made up.

const NEARBLOCKS_API = 'https://api-testnet.nearblocks.io/v3';
// Regular RPC nodes drop old transactions after a few days; the archival node keeps them.
const TX_RPCS = ['https://rpc.testnet.near.org', 'https://archival-rpc.testnet.near.org'];

export type ScopedKey = {
  publicKey: string;
  receiverId: string;
  methods: string[];
  allowance: string | null;
};

export type SignedBy = {
  txHash: string;
  publicKey: string;
  at: number;
  /** The key that signed is one of the scoped function-call keys listed above. */
  scoped: boolean;
};

export type KeyScope = {
  scoped: ScopedKey[];
  fullAccess: string[];
  /** Function-call keys that reach some other contract or method. */
  other: number;
  signedBy: SignedBy | null;
  fetchedAt: string;
};

function scopedKey(key: AccessKey): ScopedKey | null {
  const permission = key.access_key.permission;
  if (permission === 'FullAccess') return null;
  const { receiver_id, method_names, allowance } = permission.FunctionCall;
  return { publicKey: key.public_key, receiverId: receiver_id, methods: method_names, allowance };
}

const onlyRequestsPayments = (key: ScopedKey) =>
  key.receiverId === CONTRACT_ID && key.methods.length === 1 && key.methods[0] === 'request_payment';

type AgentTxn = { transaction_hash: string; block_timestamp: string; receiver_account_id: string };

async function latestAgentRequest(): Promise<AgentTxn | null> {
  const url = `${NEARBLOCKS_API}/accounts/${AGENT_ID}/txns?method=request_payment&limit=5`;
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6_000) });
  if (!res.ok) return null;
  const body = (await res.json()) as { data?: AgentTxn[] };
  return body.data?.find((t) => t.receiver_account_id === CONTRACT_ID) ?? null;
}

async function signerKey(txHash: string): Promise<string> {
  const result = await rpc<{ transaction: { public_key: string } }>(
    'tx',
    { tx_hash: txHash, sender_account_id: AGENT_ID, wait_until: 'NONE' },
    TX_RPCS,
  );
  return result.transaction.public_key;
}

async function readSignedBy(scoped: ScopedKey[]): Promise<SignedBy | null> {
  const txn = await latestAgentRequest().catch(() => null);
  if (!txn) return null;
  const publicKey = await signerKey(txn.transaction_hash);
  return {
    txHash: txn.transaction_hash,
    publicKey,
    at: Number(BigInt(txn.block_timestamp) / 1_000_000n),
    scoped: scoped.some((k) => k.publicKey === publicKey),
  };
}

export async function readKeyScope(): Promise<KeyScope> {
  const { keys } = await rpc<{ keys: AccessKey[] }>('query', {
    request_type: 'view_access_key_list',
    finality: 'final',
    account_id: AGENT_ID,
  });
  const functionCall = keys.map(scopedKey).filter((k): k is ScopedKey => k !== null);
  const scoped = functionCall.filter(onlyRequestsPayments);
  const fullAccess = keys.filter((k) => k.access_key.permission === 'FullAccess').map((k) => k.public_key);
  const signedBy = await readSignedBy(scoped).catch(() => null);
  return {
    scoped,
    fullAccess,
    other: functionCall.length - scoped.length,
    signedBy,
    fetchedAt: new Date().toISOString(),
  };
}

export function shortKey(publicKey: string) {
  const data = publicKey.replace(/^ed25519:/, '');
  return data.length <= 12 ? data : `${data.slice(0, 6)}…${data.slice(-4)}`;
}
