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
| `/dashboard` | Live contract state, activity feed, blocked attacks, agent log, Act 2 trap page |
| `/approve` | Owner approvals and freeze, signed in a NEAR wallet (Wallet Selector) |
| `/api/guardian` | Contract views plus NearBlocks tx links, refreshed by the dashboard |
| `/api/vendor/catalog` | Vendor plans |
| `/api/vendor/data/<sku>?record_id=N` | Paid data. Served only for a `COMPLETED` on-chain payment to the vendor for that item, at least its price, less than 24 hours old |
| `/api/vendor/docs/weather-api` | The booby-trapped docs page |

The vendor keeps no database: the payment record on the contract is the receipt, checked on every
request. The dashboard holds no keys. Owner actions are signed in the owner's wallet with 1
yoctoNEAR attached, which the contract requires.
