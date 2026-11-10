import { PublicKey } from '@near-js/crypto';
import { actionCreators, createTransaction, encodeTransaction } from '@near-js/transactions';
import { CONTRACT_ID } from '@/lib/config';

const MY_NEAR_WALLET = 'https://testnet.mynearwallet.com';
const GAS = 100_000_000_000_000n;
const ONE_YOCTO = 1n;

// MyNearWallet rebuilds the transaction from receiver and actions with the signer's own key,
// nonce and block hash, so those fields only need to be well-formed here.
const PLACEHOLDER_KEY = PublicKey.fromString('ed25519:11111111111111111111111111111111');

export function walletLinkFor(ownerId: string, method: string, args: Record<string, unknown>, callbackUrl: string) {
  const action = actionCreators.functionCall(method, args, GAS, ONE_YOCTO);
  const tx = createTransaction(ownerId, PLACEHOLDER_KEY, CONTRACT_ID, 0n, [action], new Uint8Array(32));
  const url = new URL('/sign', MY_NEAR_WALLET);
  url.searchParams.set('transactions', toBase64(encodeTransaction(tx)));
  url.searchParams.set('callbackUrl', callbackUrl);
  return url.toString();
}

function toBase64(bytes: Uint8Array) {
  return btoa(Array.from(bytes, (b) => String.fromCharCode(b)).join(''));
}

export type WalletReturn = { txHash: string } | { error: string } | null;

// MyNearWallet comes back with ?transactionHashes=... on success or ?errorCode=... on cancel.
export function readWalletReturn(search: string): WalletReturn {
  const params = new URLSearchParams(search);
  const hashes = params.get('transactionHashes');
  if (hashes) return { txHash: hashes.split(',')[0] };
  const errorCode = params.get('errorCode');
  if (errorCode) return { error: params.get('errorMessage') ?? errorCode };
  return null;
}
