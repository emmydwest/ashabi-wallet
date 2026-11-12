# Guardian Wallet dashboard

Next.js app with the landing page, the live dashboard, the owner's `/approve` page, and the demo
vendor (`/api/vendor/*`) the agent buys from.

```sh
npm install
npm run dev        # http://localhost:3000
npm run sync-log   # copy ../data/action-log.json after a new demo run
npm run build
```

| Route | What it is |
|---|---|
| `/` | Landing page |
| `/agent` | Live agent console and attack playground |
| `/dashboard` | Live contract state, activity feed, blocked attacks, agent log, Act 2 trap page |
| `/approve` | Owner approvals and freeze, signed in a NEAR wallet from the nav Connect button |
| `/api/agent/run` | Runs one agent turn on the server and streams the steps as NDJSON |
| `/api/guardian` | Contract views plus NearBlocks tx links, refreshed by the dashboard |
| `/api/vendor/catalog` | Vendor plans |
| `/api/vendor/data/<sku>?record_id=N` | Paid data. Served only for a `COMPLETED` on-chain payment to the vendor for that item, at least its price, less than 24 hours old |
| `/api/vendor/docs/weather-api` | The booby-trapped docs page |

The vendor keeps no database: the payment record on the contract is the receipt, checked on every
request. Owner actions are signed in the owner's wallet with 1 yoctoNEAR attached, which the
contract requires; the app never sees the owner's key.

The agent console needs these server-only env vars (set as sensitive on Vercel, never sent to the
browser):

| Var | What |
|---|---|
| `AGENT_WEB_PRIVATE_KEY` | A function-call key on `gw-emmy-agent.testnet`, limited to `request_payment` on the guardian contract, with its own gas allowance |
| `GEMINI_API_KEY`, `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY`, `GITHUB_MODELS_TOKEN` | Free model tiers. Any subset works; missing ones are skipped |

Public runs are limited to 5 per IP per 10 minutes, and a run may send at most 1.5 NEAR to an
approved payee. Requests to anyone else always go to the contract, so it records the block.

Signing on a phone:

- Connect wallet in the nav (and the same control on `/start`, `/wallet`, `/approve` and `/vault`)
  opens a themed modal: MyNearWallet, Meteor, HERE, and Intear. MyNearWallet uses a full-page
  redirect, which works in iPhone Safari. Meteor and HERE open their apps. Intear is happiest on
  desktop. Nightly is omitted: the official module is a browser extension and is not reliable in
  mobile Safari.
- Inside the Meteor app's browser, connect goes through Meteor's in-app bridge (no popups).
- Anywhere else, each pending payment also has an "Approve in MyNearWallet" link: a full-page
  redirect to `testnet.mynearwallet.com/sign` that returns to `/approve` with the tx hash.
