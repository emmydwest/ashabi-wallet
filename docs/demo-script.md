# Demo video script (~2:00–2:15)

Record from the live production site, https://guardian-wallet.vercel.app, **on desktop**
(1440×900 or 1920×1080). Use large captions. Keep the mascot in frame on the home, heist,
verify, and close shots.

This version is honest about a spent shared demo budget. Do **not** launch a live hijack, 402
purchase, or premium request if "Budget left today" is 0 NEAR, and do **not** trip the shared
demo's kill-switch. Show a real on-chain payment, a blocked-payee receipt, and an
above-threshold approval from the dashboard / live feed / verify proofs instead. The daily
budget resets at 00:00 UTC (1:00 AM Lagos). If the shared demo and the boxtest factory vault
are both spent, wait, or use those existing proof transactions.

Spoken lines are in quotes. On-screen action is in **bold**.

## 0:00 – 0:20 · Hook

Screen: landing page `/`, mascot in frame. The live feed and the Built on NEAR badge can appear
as you scroll a little.

> "Give your AI an allowance, not your bank password. This is Guardian Wallet."

> "AI agents are starting to pay for things on our behalf. A poisoned page can tell an agent
> to drain the wallet. We assume the agent will be hijacked, and make that not matter."

## 0:20 – 0:50 · The public heist, blocked on-chain

Screen: `/agent`, the **Public heist challenge** banner (live vault balance from the contract,
not a baked-in number).

> "Here is the public heist challenge. The number is the live balance in the demo vault, on
> NEAR testnet. Try to make the agent steal it. The agent can only ask. The contract decides."

**Show** the Attacks list, with each preset labelled for what it tests: hidden webpage
injection, look-alike payee spoofing (`gw-ernmy` vs `gw-emmy`), payment splitting, the
kill-switch (don't confirm it), over-budget drain, a fake owner instruction. **Do not** launch
the kill-switch on the shared demo.

Cut to a real blocked-payee receipt (the in-app "Refused · 2.00 NEAR" card, the live feed, or
the public explorer). A known proof is `AVTza2m9fpq6KWvUkUpu7Y2dAfoWqRYys4VA64aaLftb`.

> "A hijacked agent tries to send two NEAR to someone who isn't on the approved list. The
> contract refuses, and stores the attempt. No model sits between that request and that refusal."

If budget is 0, do not tap "Hijack the agent" — the contract would return `BLOCKED_BUDGET`
first, which is the wrong story.

## 0:50 – 1:10 · A real purchase over HTTP 402

Screen: `/chat` or the live feed on `/` / `/dashboard`, showing a completed 0.05 NEAR
`weather-now` payment, for example `9mJuqaKETPvgvc5ZdUagJPmp2jopZx7YAQCtAZZ1d491`.

> "A provider agent sells data over HTTP 402. A buyer agent pays through the vault — five
> hundredths of a NEAR — and only then does the data unlock. Today's shared demo budget may
> already be used; it resets at midnight UTC, so show a real payment that's already on-chain."

If budget remains, run the weather job live and **Verify intent**. That check is a
16-character prefix of the SHA-256 of the run log, written into the payment memo — not a
separate commitment scheme. The hidden-injection toggle on Attacks is "Reveal hidden
injection"; do not call it an X-Ray viewer.

## 1:10 – 1:25 · Above the threshold, the owner decides

Screen: `/approve`, or a 1.5 NEAR payment the owner already approved
(`5Egz99BbvHEe7hBkek1JCd6pxZRwGTQch2h9H7ac1iTz`, or the in-app "Approved by the owner, then
paid" row).

> "Anything over one NEAR waits for the owner. You approve from your phone, in your own
> wallet. The app never sees your key."

Do not complete an Approve in this recording unless the owner's wallet is actually signed in
and a pending request exists.

## 1:25 – 1:50 · Verify-live

Screen: `/verify`. Wait for the live checks, then scroll through the agent key scope, the
vault full-access key count (honestly "still present, removed at code freeze" until it is
zero), owner control, code hash and balance, velocity, and kill-switch.

> "You don't have to trust this UI. These checks query a public testnet RPC from your
> browser. The agent's key is limited to request_payment. Owner methods need the owner's
> signature and one yoctoNEAR. We will not trip the kill-switch on the shared demo today."

Do not delete any keys during the recording.

## 1:50 – 2:15 · Settlement layer, then close

Screen: the homepage "safe settlement layer for the agent economy" section, then `/docs` or
the MCP snippet, then `/` with the URL.

> "A provider sells, a buyer pays through the vault. There's an SDK, and a local MCP server
> you run from the repo today. Give AI the freedom to act, never the freedom to overspend.
> Try it at guardian-wallet.vercel.app."

## Short cut (30–45s, for X)

Hook on `/`, the heist banner and a blocked-payee receipt, then the URL.

> "Give your AI an allowance, not your bank password. Guardian Wallet assumes the agent will
> be hijacked, and makes that not matter. A NEAR contract holds the funds and blocks a stolen
> payment on-chain. Try it at guardian-wallet.vercel.app."

## If something goes wrong while recording

- An amber "as of HH:MM" pill: the testnet RPC is slow. Keep going; it refreshes on its own.
- Shared demo budget is 0, or the breaker is on: use the proofs above. Do not reset or freeze
  the shared demo from a public recording.
- Out of public agent runs (5 per 10 minutes): wait, or cut to proofs.
