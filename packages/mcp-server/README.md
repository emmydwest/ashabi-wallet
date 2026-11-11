# @guardian-wallet/mcp-server

A local [MCP](https://modelcontextprotocol.io) server that wraps [`@guardian-wallet/sdk`](../sdk). An assistant can read a Guardian Wallet and ask it to pay; the NEAR contract still decides whether money moves.

This package is **not published to npm**. Run it from this repo after `npm install` and `npm run build`.

## Setup

```sh
cd packages/mcp-server
npm install
npm run build
```

Environment (required unless noted):

| Variable | What it is |
| --- | --- |
| `GUARDIAN_CONTRACT` | The vault, e.g. `guardian.gw-emmy.testnet` or `boxtest.factory.gw-emmy.testnet` |
| `AGENT_ACCOUNT` | The agent account registered on that vault |
| `AGENT_PRIVATE_KEY` | A function-call private key that can only call `request_payment`. Needed for payment tools; status and `get_payment` work without it. |
| `GUARDIAN_NETWORK` | `testnet` (default) or `mainnet` |
| `GUARDIAN_RPC` | Optional RPC URL override |

The key never leaves the process and is never written to stdout.

Claude Code, from the repo root:

```sh
export GUARDIAN_CONTRACT=guardian.gw-emmy.testnet
export AGENT_ACCOUNT=gw-emmy-agent.testnet
export AGENT_PRIVATE_KEY=ed25519:...   # function-call key only
claude mcp add guardian --env GUARDIAN_CONTRACT --env AGENT_ACCOUNT --env AGENT_PRIVATE_KEY -- node packages/mcp-server/dist/index.js
```

Or a generic MCP client:

```sh
GUARDIAN_CONTRACT=guardian.gw-emmy.testnet \
AGENT_ACCOUNT=gw-emmy-agent.testnet \
AGENT_PRIVATE_KEY=ed25519:... \
node packages/mcp-server/dist/index.js
```

## Tools

| Tool | Needs a key? | What it does |
| --- | --- | --- |
| `guardian_wallet_status` | no | `get_wallet_status` on the contract |
| `guardian_get_payment` | no | `get_payment(record_id)` |
| `guardian_request_payment` | yes | `requestPayment({ receiverId, amount, memo })` |
| `guardian_fetch_402` | yes | `pay402(url)` — fetch, pay a 402 challenge, retry with the receipt |

The contract still enforces the payee list, daily budget, approval threshold, velocity limit and kill-switch. A tool call cannot bypass them.
