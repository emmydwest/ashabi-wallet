# Demo video script (2:55)

Record on a phone (or a narrow browser window) at https://guardian-wallet.vercel.app.
Before recording: open `/approve` in the owner's Meteor wallet and sign in, and check the
`/agent` page says nothing about a kill-switch. If it does, tap "Reset the circuit breaker" on
`/approve` first, or wait out the countdown. Also check "Budget left today" is at least 2 NEAR (it resets at
1:00 AM Lagos). Otherwise the 402 purchase (0.05 NEAR) still works, but the premium purchase gets
blocked on budget instead of going to the owner.

Spoken lines are in quotes. Taps are in **bold**.

## 0:00 – 0:45 · The problem and the thesis

Screen: the landing page `/`, then scroll slowly.

> "AI agents are starting to pay for things on our behalf: APIs, data, compute. But an agent
> reads everything it touches, and anything it reads can tell it what to do. One poisoned web
> page and your agent is sending your money to someone else."

> "Most fixes try to make the model smarter. Guardian Wallet assumes the agent will be hijacked,
> and makes that not matter. The agent can only ask for a payment. A NEAR smart contract holds the
> money and decides every request against my rules: who it can pay, how much per day, and when I
> have to approve."

**Tap "Try the live agent".**

## 0:45 – 1:30 · A normal purchase, paid over HTTP 402

Screen: `/agent`, "Real jobs" tab.

> "This is a real agent on NEAR testnet, running on free models. Its job: get the weather in
> Lagos right now."

**Tap the chip "What is the weather in Lagos right now?", then "Run the agent".**

Wait for the amber "402 Payment Required" badge.

> "The vendor's API says 402, payment required: five hundredths of a NEAR, to this account, with
> a one-time nonce. The agent asks the guardian to pay, with its own key. That key can call one
> method on one contract, nothing else."

Wait for "Paid on-chain", "Receipt verified" and "Unlocked".

> "The contract approves it and pays the vendor. The agent retries with the transaction hash,
> and the vendor checks that transaction on-chain itself: right payer, right amount, its own
> nonce, never used before. Then it unlocks the data. Try the same receipt again: 409."

**Tap "Verify intent".** Wait for the green "Verified".

> "And the memo carries a hash of why the agent paid. My browser just recomputed it and matched
> it against the chain."

## 1:30 – 2:15 · The injection, then the hijack

Screen: `/agent`, **tap "Attacks"**, **tap "Poisoned webpage"**.

> "Here's what a poisoned page looks like to you: clean."

**Tap "Reveal hidden injection".**

> "And here's what the agent reads: a hidden line telling it to pay the attacker."

Scroll to the top. **Tap "Watch a hijacked agent try to rob the wallet".**

> "Let's say the agent fell for it. I'm skipping the tricking step, so this compromise is
> simulated, but everything after it is real."

Wait for the amber line "Agent compromised: trying to send 2 NEAR to attacker.gw-emmy.testnet",
then the green "Contract blocked: unapproved payee".

> "Two NEAR to the attacker, with the same key that just paid the vendor. The contract says no.
> The attacker isn't on my payee list, so no money moves, and the attempt is stored on-chain."

**Tap the NearBlocks link** on the verdict.

> "No model, no prompt, no server sits between that request and that refusal. Just the contract."

## 2:15 – 2:45 · Over the limit, the owner, the kill-switch

Screen: `/agent`, "Real jobs" tab.

**Tap the chip "Buy the premium annual plan.", then "Run the agent".**

> "Anything above one NEAR needs me. The contract holds this 1.5 NEAR request as pending."

Switch to the phone with `/approve` open. **Tap "Approve"** and confirm in Meteor.

> "I approve it from my phone, with my own wallet. The app never has my key."

Back on `/agent`, or show `/approve` if the kill-switch is on.

> "And if an agent keeps trying unknown accounts, three in a row trips an automatic kill-switch.
> Every request is refused for ten minutes, or until I reset it. I can also freeze everything
> with one tap."

## 2:45 – 3:00 · Stack and vision

Screen: `/dashboard`.

> "Rust contract on NEAR, function-call keys, free models, Next.js. Give AI the freedom to act,
> never the freedom to overspend. Try to break it at guardian-wallet.vercel.app."

## If something goes wrong while recording

- The page shows an amber "as of HH:MM" pill: the testnet RPC is slow. The numbers are the last
  good on-chain state; keep going, it refreshes on its own.
- "Kill-switch on" banner on Real jobs: the breaker is doing its job. Reset it on `/approve`, or
  record the hijack anyway; it still gets a real on-chain `FROZEN` block.
- Out of runs: the public demo allows 5 runs per window. Wait it out, or record locally with
  `npm run dev`.
