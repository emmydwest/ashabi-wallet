# Demo video script (~2:00–2:15)

Record on desktop (1440×900 or 1920×1080) from the live site, https://ashabi-wallet.vercel.app.
Use large captions and keep the mascot in frame on the home, /try and /verify shots.

Spoken lines are in quotes. On-screen action is in **bold**.

Before recording:
- Open `/try` in a fresh browser profile so you get a sandbox wallet with budget left. Each
  sandbox wallet has 0.25 NEAR a day, which is enough for a few purchases.
- `/challenge` allows 3 attempts per visitor every 10 minutes. Leave one spare for the take.
- The demo vault (`guardian.gw-emmy.testnet`) has not approved Open Data Desk yet. Show the
  second provider from the sandbox wallet, not the demo vault.

## 0:00 – 0:12 · Hook

Screen: `/challenge`, with a finished attempt on screen showing the red **Refused by the
contract** verdict and its tx link.

> "This AI tried to drain itself, and the chain said no."

> "This is Ashabi Wallet. Your agent gets an allowance, not your bank password."

## 0:12 – 0:45 · A wallet in one tap (`/try`)

**Click** "Try it in 60s" in the header, then **Give me a wallet**.

> "One tap gives you your own wallet on NEAR testnet. It was made by our factory, it has a
> tiny daily budget, and its rules live in the contract."

**Click** "Buy live Lagos air quality". Let the timeline play: the 402, `request_payment`,
the contract verdict, the receipt, the data card.

> "The agent pays per request. The provider asks for 0.05 NEAR, the contract checks the
> payee and the budget, and the receipt unlocks the data. The same receipt can't be used twice."

## 0:45 – 1:15 · Hijack it

**Click** "Hijack the agent". Let the injected page and the agent's plan show.

> "Now a poisoned page tells the agent to send 2 NEAR to an attacker. The agent falls for it,
> but it can only ask. The contract refuses, because the attacker isn't an approved payee."

**Click** "View tx" on the refused card to open NearBlocks and show the failed transfer.

## 1:15 – 1:40 · Your own attack (`/challenge`)

**Paste** an injection or pick a starter, keep **Naive** on, and **Launch it**.

> "Anyone can write their own attack. You see the model's reasoning, the verdict, and the
> transaction. The scoreboard counts what the chain refused and what was ever paid to an
> unapproved account. That second number is zero."

Point at **Paid to unapproved: 0** on the scoreboard.

## 1:40 – 1:55 · A second provider

Screen: `/chat?vault=<your sandbox wallet>`.

**Type** "Get live USD exchange rates".

> "Agents can shop across providers. Open Data Desk is a second provider we run, wrapping free
> public data, with the same pay-per-request flow and its own receipts."

## 1:55 – 2:15 · Verify it yourself (`/verify`)

Screen: `/verify`, the **Locked: 0 full-access keys** card.

> "Don't trust us, check the chain. The vault has zero full-access keys, so nobody can change
> its code or sign for it, including us. The agent only holds limited keys. Copy this command
> and ask a public RPC yourself."

**Click** the copy button on the RPC command, then scroll to **Latest refusals**.

> "Ashabi Wallet. Let your AI spend, and keep the rules on chain."

## Do not

- Don't show any key, seed phrase or `.env` file.
- Don't call the second provider third-party; we run it.
- Don't say the factory has no keys. The factory account still has its full-access key.
