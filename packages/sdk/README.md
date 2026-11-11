# @guardian-wallet/sdk

The agent's side of a [Guardian Wallet](../../README.md). The agent can only ask for a payment; the contract on NEAR checks the payee allowlist, daily budget, approval threshold, velocity limit and kill-switch, then pays or refuses.

No dependencies. Reads go straight to NEAR RPC. Signing is a function you pass in, so the key can live in near-api-js, a KMS or a TEE.

```ts
import { Account, JsonRpcProvider } from 'near-api-js';
import { accountSigner, GuardianAgent, nearToYocto } from '@guardian-wallet/sdk';

const agent = new GuardianAgent({
  contractId: 'guardian.gw-emmy.testnet',
  agentId: 'gw-emmy-agent.testnet',
  // A function-call key that can only call request_payment. Server-side only.
  signer: accountSigner(
    new Account('gw-emmy-agent.testnet', new JsonRpcProvider({ url: 'https://rpc.testnet.near.org' }), process.env.AGENT_KEY!),
  ),
});

// One payment. The result carries the contract's own status.
const result = await agent.requestPayment({
  receiverId: 'api-vendor.gw-emmy.testnet',
  amount: nearToYocto('0.05'),
  memo: 'sku:weather-now',
});
if (result.status === 'BLOCKED_RECIPIENT') console.log('refused:', result.reason, result.txHash);

// HTTP 402: fetch, pay the challenge through the guardian, retry with the receipt.
const paid = await agent.pay402('https://guardian-wallet.vercel.app/api/vendor/weather-now', {
  maxPrice: nearToYocto('0.1'),
  allowedPayees: ['api-vendor.gw-emmy.testnet'],
});
if (paid.kind === 'paid') console.log(await paid.response.json());

// Reads need no key.
const policy = await agent.getPolicy();
const status = await agent.getStatus();
```

## API

| Method | Returns |
| --- | --- |
| `requestPayment({ receiverId, amount, memo?, requestId? })` | `PaymentResult` with `status: RequestStatus \| null`, `recordId`, `reason`, `txHash` |
| `pay402(url, options?)` | `{ kind: 'free' \| 'refused' \| 'not-paid' \| 'paid' \| 'receipt-refused', ... }` |
| `getPolicy()` | payees, limits, guards and pending rules |
| `getStatus()` | the full `WalletStatus`, including budget left and kill-switch state |
| `getPayment(id)` / `waitForSettlement(id)` | a `PaymentRecord` |

`RequestStatus` is the contract's enum: `APPROVED`, `PENDING_APPROVAL`, `BLOCKED_RECIPIENT`, `BLOCKED_BUDGET`, `BLOCKED_VELOCITY`, `INSUFFICIENT_FUNDS`, `FROZEN`, `DUPLICATE`, `TOO_MANY_PENDING`. A transaction that failed before the contract answered has `status: null` and an `error`.

`pay402` hooks (`onChallenge`, `onRequest`, `onPayment`, `onSettled`) let you log each step or veto a challenge. The live dashboard's agent uses exactly these hooks to stream its runs.

The package ships TypeScript source. In Next.js add it to `transpilePackages`.
