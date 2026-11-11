# Demo video script (~2:30)

Record from the live production site, https://guardian-wallet.vercel.app.
Mostly a phone frame (390×844 or 414×896), with a few desktop cuts. Keep
the mascot in frame on the home, verify, and close shots.

This version is honest about a spent shared demo budget. Do **not** launch
a live hijack, 402 purchase, or premium request if "Budget left today" is
0 NEAR, and do **not** trip the shared demo's kill-switch. Show a real
on-chain payment, a blocked-payee receipt, and an above-threshold approval
from the dashboard / verify proofs instead. The daily budget resets at
00:00 UTC (1:00 AM Lagos). If the shared demo and the boxtest factory
vault are both spent, wait, or use those existing proof transactions.

Spoken lines are in quotes. On-screen action is in **bold**.

## 0:00 – 0:30 · Hook and the problem

Screen: landing page `/`, mascot in frame.

> "Give your AI an allowance, not your bank password. This is Guardian Wallet."

> "AI agents are starting to pay for things on our behalf. But an agent reads
> everything it touches, and a poisoned page can tell it to drain the wallet."

> "Guardian Wallet assumes the agent will be hijacked, and makes that not
> matter. The agent can only ask. A NEAR contract holds the funds and decides.
> It's built on NEAR, for the AI Security and Agent Economy tracks."

Scroll just enough to show the Built on NEAR badge and the two tracks.

## 0:30 – 0:55 · A real purchase over HTTP 402

Screen: `/chat`. **Type** "Buy me today's weather report." Do not send if
the shared budget is spent.

> "Here's the live chat agent. You ask it to buy a weather report. The vendor
> answers with HTTP 402: Payment Required. The agent pays through the
> guardian — five hundredths of a NEAR — and only then does the data unlock."

Cut to `/dashboard` (or a NearBlocks receipt) on a real 402 payment, for
example `9mJuqaKETPvgvc5ZdUagJPmp2jopZx7YAQCtAZZ1d491` or the MCP payment
`7NBA3Vfw6bUpX8LydZtByArJJSnJYzDTVjNQDgRNbPE2`.

> "Today's shared demo budget is already used; it resets at midnight UTC, so
> I'm showing a real payment that's already on-chain."

If budget remains, **tap a weather prompt** and **Run the agent**, wait for
the amber 402, the payment, and the unlocked data, then **Verify intent**.

## 0:55 – 1:15 · The hijack, blocked on-chain

Screen: `/agent` Attacks tab, then `/dashboard` blocked-attacks feed, then
the NearBlocks receipt for `AVTza2m9fpq6KWvUkUpu7Y2dAfoWqRYys4VA64aaLftb`
(hijacked agent, 2 NEAR to an unapproved payee).

> "Now the attack. A hijacked agent tries to send two NEAR to someone who
> isn't on the approved list. The contract refuses, and stores the attempt.
> Here's the receipt on NearBlocks. No model sits between that request and
> that refusal."

Do not tap "Hijack the agent" on the shared demo if budget is 0 — the
contract would return `BLOCKED_BUDGET` first, which is the wrong story.
Other blocked-payee proofs: `GMHSVLSGh8wEGAs7pmeMNWh4HLjpmd8QCLRJobVKXkcR`.

## 1:15 – 1:28 · Above the threshold, the owner decides

Screen: `/approve`, or the proof of an owner approval
(`5Egz99BbvHEe7hBkek1JCd6pxZRwGTQch2h9H7ac1iTz`) / a 1.5 NEAR request that
waited (`8D6HW9p6eGudHSzNQnThAo7p2D2V3aqmh6KxVvUf46Ye`).

> "Anything over one NEAR waits for the owner. You approve from your phone,
> in your own wallet. The app never sees your key."

Do not complete an Approve in this recording unless the owner's Meteor
wallet is actually signed in and a pending request exists.

## 1:28 – 1:55 · Verify-live, velocity, kill-switch

Screen: `/verify`. Wait for the live checks to finish, then scroll through
the agent key, code hash, velocity limit, and kill-switch cards.

> "You don't have to trust this UI. This verify panel queries a public
> testnet RPC from your browser: the agent's key, the code hash, the
> velocity limit, and the kill-switch. Automatic payments are capped at
> three payments or one NEAR in ten minutes. Three blocked payments to
> unknown accounts in a row pause spending. We won't trip that on the
> shared demo today."

## 1:55 – 2:15 · Your own vault, SDK, MCP

Screen: `/start`, then desktop `/docs`.

> "Anyone can create their own guarded wallet in one transaction, through a
> factory on NEAR. Connect a wallet, pick a template, and you own the vault.
> There's an SDK, and a local MCP server, so other agents can call the same
> rules."

Do not submit the factory form without a connected owner wallet.

## 2:15 – 2:30 · Close

Screen: `/`, mascot, URL on screen.

> "Give AI the freedom to act, never the freedom to overspend. Try it at
> guardian-wallet.vercel.app."

## Short cut (30–45s, for X)

Hook on `/`, then the blocked-payee NearBlocks receipt, then the URL.

> "Give your AI an allowance, not your bank password. Guardian Wallet
> assumes the agent will be hijacked, and makes that not matter. A NEAR
> contract holds the funds and blocks a stolen payment on-chain. Try it at
> guardian-wallet.vercel.app."

## If something goes wrong while recording

- An amber "as of HH:MM" pill: the testnet RPC is slow. Keep going; it
  refreshes on its own.
- Shared demo budget is 0, or the breaker is on: use the proofs above.
  Do not reset or freeze the shared demo from a public recording.
- Out of public agent runs (5 per 10 minutes): wait, or cut to proofs.
- A careful-model attack is fine to show later, but it is not required
  for this cut; the contract layer is the claim we have to show on-chain.
