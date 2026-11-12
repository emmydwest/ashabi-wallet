# ashabi-wallet-mcp

A local [MCP](https://modelcontextprotocol.io) server that wraps [`ashabi-wallet-sdk`](../sdk). An assistant can read an Ashabi Wallet and ask it to pay; the NEAR contract still decides whether money moves.

This package is **not published to npm** yet. Run it from this repo after `npm install` and `npm run build`. Once it is published, the same server will start with `npx -y ashabi-wallet-mcp`.

## Setup (today, from the repo)

```sh
cd packages/mcp-server
npm install
npm run build
```

Environment (required unless noted):

| Variable | What it is |
| --- | --- |
| `ASHABI_CONTRACT` | The vault, e.g. `guardian.gw-emmy.testnet` or `boxtest.factory.gw-emmy.testnet` |
| `AGENT_ACCOUNT` | The agent account registered on that vault |
| `AGENT_PRIVATE_KEY` | A function-call private key that can only call `request_payment`. Needed for payment tools; status and `get_payment` work without it. |
| `ASHABI_NETWORK` | `testnet` (default) or `mainnet` |
| `ASHABI_RPC` | Optional RPC URL override |

The older `GUARDIAN_CONTRACT`, `GUARDIAN_NETWORK` and `GUARDIAN_RPC` names still work, from before the project was renamed.

The key never leaves the process and is never written to stdout.

```sh
export ASHABI_CONTRACT=guardian.gw-emmy.testnet
export AGENT_ACCOUNT=gw-emmy-agent.testnet
export AGENT_PRIVATE_KEY=ed25519:...   # function-call key only
node dist/index.js
```

Claude Code, from the repo root:

```sh
export ASHABI_CONTRACT=guardian.gw-emmy.testnet
export AGENT_ACCOUNT=gw-emmy-agent.testnet
export AGENT_PRIVATE_KEY=ed25519:...
claude mcp add ashabi --env ASHABI_CONTRACT --env AGENT_ACCOUNT --env AGENT_PRIVATE_KEY -- node packages/mcp-server/dist/index.js
```

After publish (not yet):

```sh
npx -y ashabi-wallet-mcp
```

## Tools

| Tool | Needs a key? | What it does |
| --- | --- | --- |
| `ashabi_wallet_status` | no | `get_wallet_status` on the contract |
| `ashabi_get_payment` | no | `get_payment(record_id)` |
| `ashabi_payee_report` | no | `get_payee_report(account_id)`: is the account on the vault's blocklist, and why |
| `ashabi_request_payment` | yes | `requestPayment({ receiverId, amount, memo })` |
| `ashabi_fetch_402` | yes | `pay402(url)` — fetch, pay a 402 challenge, retry with the receipt |

The contract still enforces the payee list, daily budget, approval threshold, velocity limit and kill-switch. A tool call cannot bypass them.
