# Demo video script (2:55)

Record on a phone (or a narrow browser window) at https://guardian-wallet.vercel.app.

Before recording:

- Open `/approve` in the owner's Meteor wallet and sign in.
- Check `/agent` says nothing about a kill-switch. If it does, tap "Reset the circuit breaker" on
  `/approve`, or wait out the countdown.
- Check "Budget left today" is at least 2 NEAR (it resets at 1:00 AM Lagos). Otherwise the 402
  purchase (0.05 NEAR) still works, but the premium purchase is blocked on budget instead of
  going to the owner.

Spoken lines are in quotes. Taps are in **bold**. The order follows the review: the hijack
first, then which layer stopped what, then the economy story.

## 0:00 – 0:30 · The problem

Screen: the landing page `/`.

> "AI agents are starting to pay for things on our behalf. But an agent reads everything it
> touches, and anything it reads can tell it what to do. One poisoned page and your agent is
> paying someone else."

> "Guardian Wallet assumes the agent will be hijacked and makes that not matter. The agent can
> only ask for a payment. A NEAR contract holds the money and decides."

**Tap "Try the live agent".**

## 0:30 – 1:05 · The hijack

Screen: `/agent`. **Tap B, "Hijack the agent".**

> "Say the agent has been fully compromised. I'm skipping the tricking step, so the compromise is
> simulated, but everything after it is real: the agent's own key, a real transaction."

Wait for "Agent compromised: trying to send 2 NEAR to attacker.gw-emmy.testnet", then the green
card "Defense: contract layer - model compromised, contract blocked unapproved payee".

> "Two NEAR to the attacker. The contract says no: the attacker isn't on my payee list. Contract
> verdict: blocked, unapproved payee. No money moves, and the attempt is stored on-chain."

**Tap "View tx"** on the verdict.

> "No model, no prompt, no server sits between that request and that refusal."

## 1:05 – 1:40 · Two layers: model, then contract

**Tap "Attacks"**, **tap "Poisoned webpage"**, **tap "Reveal hidden injection".**

> "This is what the agent reads and you don't: a hidden line telling it to pay the attacker."

**Tap "Careful agent", then "Launch the attack".**

> "A careful model often spots it: defense at the model layer."

**Tap "Naive agent", then "Launch the attack".**

> "A small, trusting model falls for it. The step it followed lights up red, and the contract
> blocks it anyway: defense at the contract layer. The wallet doesn't need the model to be smart."

If the careful model also falls for it, say: "This time the model fell for it too, and the
contract still blocked it."

## 1:40 – 2:15 · A real purchase over HTTP 402

**Tap "Real jobs"**, the chip "What is the weather in Lagos right now?", then **"Run the agent"**.

Wait for the amber "402 Payment Required".

> "The vendor answers 402: a price, a payee and a one-time nonce. The agent pays through the
> guardian, retries with the transaction hash, and the vendor checks that transaction on-chain
> before it unlocks the data. The same receipt again gets 409."

**Tap "Verify intent".** Wait for "Verified".

> "The memo also carries a hash of why the agent paid, an audit trail my browser just checked
> against the chain."

## 2:15 – 2:45 · The owner

**Tap the chip "Buy the premium annual plan.", then "Run the agent".**

> "Anything above one NEAR needs me. At most three requests can wait, and one I ignore expires
> after a day and gives its budget back."

Switch to the phone with `/approve` open. **Tap "Approve"** and confirm in Meteor.

> "I approve from my phone, in my own wallet. The app never sees my key. Three attacks in a row
> trip an automatic kill-switch, and I can freeze everything with one tap."

## 2:45 – 2:55 · Close

Screen: `/dashboard`.

> "A Rust contract, NEAR function-call keys, free models, and an SDK any agent can use. Give AI
> the freedom to act, never the freedom to overspend. Try to break it at guardian-wallet.vercel.app."

## Optional cut: a scripted attack or another purchase (if there's time)

On `/agent`, Attacks → "Over-budget drain" or "Smurfing / velocity block" (the latter needs
budget left today). Or on `/chat`, "Get me this morning’s news digest" / "Translate payment
received into Yoruba".

## Optional cut: your own wallet (if there's time, or for a second video)

Screen: phone, `/start`. Connect, pick "API buyer", name it, 2 NEAR, confirm.

> "Anyone can get their own guarded wallet in one transaction. It runs the same contract, from a
> global contract on NEAR, so it costs a quarter of a NEAR to set up."

`/chat` → "Renew my API plan for a year" → the card appears → tap Review → Approve.

## If something goes wrong while recording

- An amber "as of HH:MM" pill: the testnet RPC is slow. The numbers are the last good on-chain
  state; keep going, it refreshes on its own.
- The kill-switch banner on Real jobs: the breaker is doing its job. Reset it on `/approve` (owner
  only; there is no public reset), or record the hijack anyway; it still gets a real on-chain
  `FROZEN` block.
- Out of runs: the public demo allows 5 runs per 10 minutes. Wait it out, or record locally
  with `npm run dev`.
