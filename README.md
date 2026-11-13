# Ashabi Wallet

**An AI agent with its own NEAR wallet that really thinks and spends on pay-per-request APIs, but a NEAR
contract decides what it can spend, so it can't be talked into draining itself.**

- **Problem:** AI agents that hold a wallet can be talked into paying anyone. One poisoned web page, invoice or tool result is enough, and a better prompt is a promise, not a lock.
- **Solution:** the agent can only *ask* for payments. A NEAR contract holds the funds and checks every request against the owner's rules (approved payees, daily budget, human approval above a threshold, velocity limit, kill-switch), and records every refusal on-chain.
- **Live demo:** https://ashabi-wallet.vercel.app/agent · **Contract:** [`guardian.gw-emmy.testnet`](https://testnet.nearblocks.io/address/guardian.gw-emmy.testnet) (NEAR testnet)
- **Your own wallet:** https://ashabi-wallet.vercel.app/start creates one per user through [`factory.gw-emmy.testnet`](https://testnet.nearblocks.io/address/factory.gw-emmy.testnet) from a NEP-591 global contract; https://ashabi-wallet.vercel.app/chat is an assistant that buys through it
- **Track:** AI Security & Defense (primary) · Agent Economy (secondary)

> **About the name.** This project was called Guardian Wallet until 12 November 2026. NEAR account ids
> can't be renamed, so the deployed testnet accounts keep their original ids (the demo vault is still
> `guardian.gw-emmy.testnet`). The Rust crates and the contract's NEP-297 event standard
> (`guardian_wallet`) keep the old name too, so the code in this repo matches what is deployed.
> https://guardian-wallet.vercel.app still works and serves the same site.

Prompt-inject the agent, swap its model, steal its key: the worst it can do is file requests the
contract refuses. Owner view for phones: https://ashabi-wallet.vercel.app/approve. Agents can
plug in with the [`ashabi-wallet-sdk`](packages/sdk) package (not on npm yet; install from `./packages/sdk`).

## For judges: try it in 2 minutes

No wallet, no sign-up, no testnet NEAR. Everything runs on the project's own testnet vault,
with the agent's own limited key. Open https://ashabi-wallet.vercel.app/agent on any phone or laptop.

1. **The public heist challenge** at the top of `/agent` shows the live vault balance from the
   contract (not a baked-in figure). **Tap B, "Hijack the agent".** The agent sends 2 NEAR to the
   attacker; the contract refuses it on-chain. Tap "View tx" for the NearBlocks record. A live
   feed on `/` and below the arena lists recent purchases and blocked attempts from the same vault.
2. **Real jobs tab → "What is the weather in Lagos right now?" → Run.** The vendor answers
   402, the agent pays 0.05 NEAR through the vault contract, retries with the receipt, and the data
   unlocks. Then tap **Verify intent**: your browser recomputes the hash and matches the memo on-chain.
3. **Attacks tab → pick a preset → Reveal hidden injection.** That's the text only the agent
   reads. Choose Naive or Careful agent and launch; if the model falls for it, the step is
   outlined in red and the contract blocks the payment.
4. **Real jobs → "Buy the premium annual plan."** At 1.5 NEAR it's over the 1 NEAR threshold,
   so it waits as pending on `/approve`. Only the owner's wallet can approve it; you can watch it wait.
5. **Optional, with a testnet wallet: `/start`.** Connect from the nav (MyNearWallet, Meteor, HERE or Intear),
   pick a template, name it, attach 2 testnet NEAR ([free from the faucet](https://near-faucet.io/)).
   One transaction creates your own Ashabi wallet and its agent. Then `/chat` →
   "Renew my API plan for a year" files a 1.5 NEAR request that waits on a card at
   `/vault/<your wallet>/request/<id>`, which you approve from your phone.

6. **Open `/verify`.** The checks run in your browser against a public testnet RPC: the agent
   key’s scope, the vault’s full-access key count (0 since 13 Nov 2026, so the code can't change),
   owner control (owner methods need the owner’s signature and 1 yoctoNEAR), the contract code
   hash and balance, the velocity limit, the kill-switch, and the latest blocked attempt. Under
   that is every proof transaction with a NearBlocks link.

What you might see:

- **"Kill-switch on" with a countdown.** Three attacks in a row from anyone trip the circuit
  breaker. That's the defence working. Attacks still run and still get blocked, and honest jobs resume when the cooldown ends.
- **Budget used up.** The daily budget resets at 1:00 AM Lagos (00:00 UTC).
- **Out of runs.** Each visitor gets 5 runs per 10 minutes, so the shared vault and the agent key's gas last.

Want to try the owner side (approve, freeze, change rules, the policy writer)? Deploy your own
copy with yourself as owner: see [Reproduce](#reproduce). The payout wallet in our submission
is a separate mainnet account and has nothing to do with this demo.

Built at NEAR HACKATHON, Nov 2026. Tracks: AI Security & Defense, Agent Economy.

## Proof on-chain

Every row is a real transaction from the live demo.

| What happened | Status | Transaction |
|---|---|---|
| Agent buys a 0.3 NEAR forecast from the approved vendor | `APPROVED`, settled | [EUnUDq8N…](https://testnet.nearblocks.io/txns/EUnUDq8NLvfdenULi2X2Q6XFc99ruA8xrDbEmSnmHMvN) |
| Agent hits a 402, pays 0.05 NEAR with the vendor's nonce, retries with the receipt, gets the data | `APPROVED`, receipt verified | [9mJuqaKE…](https://testnet.nearblocks.io/txns/9mJuqaKETPvgvc5ZdUagJPmp2jopZx7YAQCtAZZ1d491) |
| Naive agent follows a hidden `display:none` instruction; memo carries its intent hash | `BLOCKED_RECIPIENT` | [F3ycvuJC…](https://testnet.nearblocks.io/txns/F3ycvuJCmQomwbM6AiiLhBrcb2CzvBJ7MpCEG6WA7N54) |
| Hijacked agent sends 2 NEAR to the attacker | `BLOCKED_RECIPIENT` | [AVTza2m9…](https://testnet.nearblocks.io/txns/AVTza2m9fpq6KWvUkUpu7Y2dAfoWqRYys4VA64aaLftb) |
| Poisoned docs trick the model into paying a look-alike vendor | `BLOCKED_RECIPIENT` | [GMHSVLSG…](https://testnet.nearblocks.io/txns/GMHSVLSGh8wEGAs7pmeMNWh4HLjpmd8QCLRJobVKXkcR) |
| Agent splits a 1.5 NEAR purchase into small pieces | `BLOCKED_VELOCITY` | [E1WH3RiM…](https://testnet.nearblocks.io/txns/E1WH3RiMuBSb8tGR6ZbSa5My4to3ap38yCp66jJ2mocm) |
| Third attack in a row trips the circuit breaker | `breaker_tripped` | [ERmLh6Kn…](https://testnet.nearblocks.io/txns/ERmLh6KnkYfGKnKjiwNQ3v4srU7RfhzQh8KCz8wcZoDY) |
| Next request while the breaker is on | `FROZEN` | [DoNJY3xx…](https://testnet.nearblocks.io/txns/DoNJY3xxvwr3FRZCeq4ngiWZ7jda6wBzpa3SLuRB7xkZ) |
| An approved vendor's quote jumps from 0.05 to 1 NEAR right after a normal purchase | `BLOCKED_VELOCITY` | [67nR9apJ…](https://testnet.nearblocks.io/txns/67nR9apJXtrWJaVgwooPc1dFkFBc6HXE2xRK6A9VEi8y) |
| Agent pays the look-alike `api-vendor.gw-ernmy.testnet` | `BLOCKED_RECIPIENT` | [BmBFDFtM…](https://testnet.nearblocks.io/txns/BmBFDFtMG4CQio3Xh18uCxAtiq3UtjQkNuYJ3sc1Hr3e) |
| Vault upgraded in place to the blocklist code, the last upgrade before the lock; budget, records and guards kept | `deploy` + `migrate` | [EHXQs4iz…](https://testnet.nearblocks.io/txns/EHXQs4izxEDWvXVHcmE4mB1D9q5DfsU3MRpb5YwLtc77) |
| A fresh account swaps in new contract code | `deploy` | [8dMgBbVC…](https://testnet.nearblocks.io/txns/8dMgBbVCaVdKtsNosAVDQVMEKrcGrer6incceUUgPUNd) |
| The security desk reports it, citing that transaction | `payee_reported` | [6WWMRu6A…](https://testnet.nearblocks.io/txns/6WWMRu6Az2Yu8uJBiHyZ7doAUDmVrjZANQoMHFVcaoms) |
| Agent tries to pay the reported account | `BLOCKED_COUNTERPARTY` | [AEydt7eQ…](https://testnet.nearblocks.io/txns/AEydt7eQR6BSKURaDAi5EXiaKg8jcVRYMLrHn4YBfE1n) |
| Vault's last full-access key deleted: no one can redeploy or sign for `guardian.gw-emmy.testnet` again | `delete_key`, 0 keys left | [4sji6Jsj…](https://testnet.nearblocks.io/txns/4sji6Jsju1RB3Dua7LtBSeVp5p4cztPb1KzGM2shGpWa) |
| Agent account's full-access key deleted; only its `request_payment` keys remain | `delete_key` | [4wv9ozaq…](https://testnet.nearblocks.io/txns/4wv9ozaqH47JqFxfbxTeJXAs8QXdZNJu8gMRZBE6yNYZ) |
| After the lock: a 0.05 NEAR weather purchase over 402 still settles | `APPROVED`, receipt verified | [BXuf9w2b…](https://testnet.nearblocks.io/txns/BXuf9w2bTSHoDUgiiX83jgsQsFSNSWhgMx9eD3ezmyV2) |
| After the lock: the hijacked agent's 2 NEAR to the attacker is still refused | `BLOCKED_RECIPIENT` | [FU8MCuWZ…](https://testnet.nearblocks.io/txns/FU8MCuWZmUs734CL54McjmH7j75PCWqZZVAaBbHLnnGD) |
| 1.5 NEAR upgrade waits for the owner | `PENDING_APPROVAL` | [8D6HW9p6…](https://testnet.nearblocks.io/txns/8D6HW9p6eGudHSzNQnThAo7p2D2V3aqmh6KxVvUf46Ye) |
| Owner approves on a phone (Meteor wallet) | `approve_payment` | [5Egz99Bb…](https://testnet.nearblocks.io/txns/5Egz99BbvHEe7hBkek1JCd6pxZRwGTQch2h9H7ac1iTz) |
| Vault code published once as a global contract (hash `3Rh6iyiZ…`) | `deploy-as-global` | [AMofamyG…](https://testnet.nearblocks.io/txns/AMofamyGtE7c72ZM6jFzHvMWkhsy8H599owDRXAixYpR) |
| Factory creates `boxtest.factory.gw-emmy.testnet` and its agent from the API-buyer template | `vault_created`, `agent_ready: true` | [2oWi2LgT…](https://testnet.nearblocks.io/txns/2oWi2LgtMzKd8iuHhibr3bweqk3GA2MGpWre6aBaFWP1) |
| `/chat` buys a 0.05 NEAR report over 402 from that wallet with the hosted agent key | `APPROVED`, receipt verified | [4ZJRLZiA…](https://testnet.nearblocks.io/txns/4ZJRLZiAnLy6FLjBwxmRqdZ3UFbNKWnMRjPW2Ad59w4q) |
| Its owner approves a 1.5 NEAR plan renewal that waited for them | `approve_payment`, then `COMPLETED` | [8yeSMFez…](https://testnet.nearblocks.io/txns/8yeSMFezUch7WYpWkKGog2hix2qWhNW2tfiTC5S26gQG) |
| MCP server buys a 0.05 NEAR report over 402 from that same factory wallet | `APPROVED`, receipt verified | [7NBA3Vfw…](https://testnet.nearblocks.io/txns/7NBA3Vfw6bUpX8LydZtByArJJSnJYzDTVjNQDgRNbPE2) |

Read it yourself, no keys needed:

```sh
near contract call-function as-read-only guardian.gw-emmy.testnet get_wallet_status json-args '{}' network-config testnet now
near contract call-function as-read-only guardian.gw-emmy.testnet get_blocked_attempts json-args '{"limit":5}' network-config testnet now
near contract call-function as-read-only guardian.gw-emmy.testnet get_reported_payees json-args '{}' network-config testnet now
```

## How it fits together

```mermaid
flowchart LR
  user([Anyone on /agent]) --> api[Next.js route<br/>server only]
  api --> llm[Free models<br/>Groq · Gemini · OpenRouter · NVIDIA · GitHub Models]
  api -->|GET, 402, retry with receipt| vendor[Demo vendor<br/>catalog, docs, paid API]
  vendor -->|checks the receipt tx| rpc[(Testnet RPC)]
  vendor -. hidden prompt injection .-> llm
  api -->|request_payment<br/>function-call key| vault{guardian.gw-emmy.testnet}
  vault -->|APPROVED| payee[api-vendor.gw-emmy.testnet]
  vault -->|BLOCKED_* / FROZEN| log[(Blocked attempts<br/>stored on-chain)]
  vault -->|PENDING_APPROVAL| owner([Owner phone<br/>/approve, Meteor wallet])
  owner -->|approve / reject / freeze<br/>1 yocto, full-access key| vault
  dash["/dashboard"] -->|view calls| vault
```

The model decides *what* to buy. The contract decides *whether money moves*. Nothing between
them is trusted.

### Why not a TEE or a prompt firewall?

TEEs prove what code ran and keep keys confidential, but an LLM inside an enclave that reads
poisoned data will still sign a bad transaction with its attested key; Ashabi Wallet enforces
deterministic rules at NEAR consensus, so it needs no trust in enclave hardware and complements a
TEE rather than replacing it.

| Approach | Under indirect prompt injection | Where trust lives |
|---|---|---|
| Prompt guardrails / LLM judges | Lower the odds; a new phrasing can still get through, and the agent keeps full signing power | Another model's judgement |
| TEE agent wallets | The enclave faithfully signs whatever the tricked model decided | Enclave hardware and the code it attests |
| EVM smart-account session keys | Can cap spend per key, much like this; needs a smart account, bundler, paymaster and policy modules, so more moving parts | The account implementation and each module |
| Ashabi Wallet | Payee, budget, threshold, velocity and kill-switch checks hold whatever the model decided | The contract's code and NEAR consensus |

Track 06 themes it covers: scoped function-call keys, an on-chain policy engine and a sandboxed
agent wallet. Signing the intent hash inside a TEE is future work (see the threat model).

### How approaches compare

A short look at the usual ways of limiting an agent wallet. This talks about approaches, not
about any one project, and only lists behaviour that exists in this repo.

| Capability | Model-only guardrails | Basic allowlist wallet | TEE risk check | Ashabi Wallet |
|---|---|---|---|---|
| Scoped function-call key (`request_payment` only) | No | Typically yes | The key may live in the enclave | Yes |
| Daily budget and payee allowlist | No | Yes | No: it scores risk, it does not pay | Yes |
| Rolling velocity cap (threshold splitting) | No | Typically per-transaction and daily only | No | Yes: `BLOCKED_VELOCITY` |
| Automatic N-strike kill-switch | No | Typically a manual freeze | No | Yes: trips after 3 unknown-payee blocks |
| Human approval above a threshold, with expiry | No | Sometimes; rules may be locked afterwards | No | Yes: phone signing, 24 h expiry, at most 3 pending |
| HTTP 402 paywall and nonce receipt | No | Sometimes | No | Yes: challenge → pay → receipt unlock; a replay is `409` |
| Interactive injection lab and 1-tap hijack | No | Often a static page | Sometimes | Yes: live transactions on `/agent` |
| SHA-256 intent memo, verified in the browser | No | No | No | Yes |
| Attests which model ran | No | No | Yes | No; we do not claim this |
| Rules still hold after the model is tricked | No | Yes, for the rules it has | No: the enclave signs the tricked decision | Yes: consensus-layer checks |


### Paying for an API over HTTP 402

The vendor's paid endpoint, `GET /api/vendor/<sku>` (`/api/vendor/weather` for the basic plan),
answers an unpaid request with `402 Payment Required` and a price, payee and single-use nonce.
The live catalog is weather (0.05 / 0.3 / 0.8 NEAR), a news digest (0.08), a translation (0.12),
an icon pack (0.25), a market report (0.4) and a premium annual plan (1.5, which waits for the owner).
The agent pays through the vault contract with `sku:<sku> | nonce:<nonce>` in the memo, then retries
with `X-NEAR-Receipt-Tx: <hash>`. Before it returns any data, the vendor fetches that
transaction from a testnet RPC and checks four things:

- the agent signed it and sent it to the vault contract as a single `request_payment`,
- it pays the exact price to the vendor, for this SKU, with a nonce this vendor issued and
  that hasn't expired (HMAC-signed, 15 minutes),
- the vault contract returned `APPROVED` and the transfer receipt to the vendor succeeded,
- neither the receipt nor the nonce has been used before (a second try gets `409`).

There's no database: the chain is the payment record, and used receipts are kept in Vercel's
runtime cache. Every paid run on `/agent` replays its own receipt at the end to show the `409`.
Payments above the approval threshold skip the 402 loop and wait for the owner as before.

### Intent hashes

Every `request_payment` the console sends carries `intent:<16 hex>` in its memo. That's the
first 16 hex characters of the SHA-256 of the run's intent log (task, model, the model's reasoning, SKU,
amount, payee, installments, timestamp, as sorted-key JSON). The full log comes back with the
run and is kept for 7 days at `/api/intent/<id>`. "Verify intent" on `/agent` recomputes the hash
in the browser and compares it with the memo it reads straight from a testnet RPC. It is an
audit-trail commitment: it proves the log wasn't edited after the payment, not who wrote it.

## Your own Ashabi wallet

`/start` turns the demo into something anyone with a testnet wallet can use. One transaction to
`factory.gw-emmy.testnet` (`factory/`, Rust, 15 tests) creates two accounts:

- **`<name>.factory.gw-emmy.testnet`, the wallet.** It runs the same vault contract code as the demo,
  initialised with the caller as owner and a template's rules (*Shopping assistant* 5 NEAR/day,
  ask over 1; *API buyer* 2/day, ask over 0.5; *Tight leash* 1/day, ask over 0.1), with optional
  overrides. It gets **no access keys at all**: nobody, including the factory, can redeploy it or
  sign for it. Only its owner can change the rules, through the contract.
- **`<name>-agent.factory.gw-emmy.testnet`, the agent.** It holds one function-call key that can
  call only `request_payment` on that one wallet, with a 0.25 NEAR gas allowance. By default it's
  the app's hosted agent key, so `/chat` works right away; pass `agent_key` to `create_vault` to
  use your own agent instead.

**Why global contracts.** Deploying the 200 KB wasm into every wallet would cost about 2 NEAR of
storage each. Instead the vault code was published once with NEP-591 (`deploy-as-global`, about
23 NEAR burned, paid from faucet funds), and each wallet points at it by code hash
(`Promise::use_global_contract`). A new wallet costs **0.26 NEAR** in fees (0.25 for the agent's gas,
0.01 for the registry entry); the rest of the deposit (minimum 0.5, `/start` suggests 2) lands in
the wallet. Using the hash rather than the publishing account pins the code: if it ever changed,
the factory owner (`realfile1618.testnet`) would have to switch the hash with `set_vault_code_hash`,
and existing wallets keep the code they were created with.

**If something fails.** If the wallet can't be created, the factory refunds the whole deposit and
frees the name (`vault_failed`). If only the agent account fails, the wallet stays usable, the
0.25 NEAR comes back to the owner, and it's marked `NO_AGENT`.

**What the app trusts.** The vendor accepts receipts from the demo wallet or any wallet the factory
created. It reads the wallet's `agent_id` on-chain and checks the transaction was signed by that
agent and the transfer came from that wallet; the `X-NEAR-Receipt-Signer` header is only a lookup
hint. `/api/agent/run` only uses the hosted key for a wallet whose factory record is `READY` and
whose agent matches. The hosted key is shared across hosted wallets: if it leaked, someone could
file requests against those wallets, and every one would still be held to its owner's rules, its
payee list and the 0.25 NEAR gas allowance.

Get testnet NEAR: create an account in [MyNearWallet](https://testnet.mynearwallet.com/) and use
the [NEAR testnet faucet](https://near-faucet.io/). Nothing here touches mainnet.

## Security guarantees

What holds even if the agent, its model and its server are fully compromised:

- **Funds only go to approved payees.** Anything else is `BLOCKED_RECIPIENT`, recorded, not paid.
- **Daily budget is hard.** Spent plus reserved plus the new amount can never pass the daily limit.
- **Big payments need a human.** Above 1 NEAR the request waits for the owner's wallet signature.
- **No salami slicing.** Automatic payments in any 10 minutes can't add up past the 1 NEAR
  threshold (and at most 3 of them), so splitting a big payment just produces `BLOCKED_VELOCITY`.
- **Reported payees stay blocked.** The owner, or a reporter the owner trusts, can put an account
  on the vault's blocklist with a reason and an evidence transaction. Payments to it are
  `BLOCKED_COUNTERPARTY`, even if it's also an approved payee, and the owner can't approve a
  waiting payment to it either. Only the owner takes an entry off.
- **Automatic kill-switch.** 3 payments to unknown or reported accounts in a row trip a circuit breaker that
  refuses every request for a cooldown (10 minutes by default), or until the owner resets it.
- **No replays.** A `request_id` works once.
- **Approvals can't pile up.** At most 3 requests wait for the owner at once (`TOO_MANY_PENDING`
  after that), and a request nobody approves expires after 24 hours and gives its reserved budget back.
- **The agent's key can't change the rules.** It is a NEAR function-call key that may call
  `request_payment` on this contract and nothing else, with no deposit. Every policy method needs
  1 yoctoNEAR attached, which only a full-access key (the owner's wallet) can send.
- **Evidence survives.** Policy violations don't panic, so the blocked attempt, the memo the agent
  wrote and the reason are stored and emitted as NEP-297 events.
- **AI never changes the rules.** The policy writer on `/approve` only proposes. Its output
  is checked against hard bounds (daily limit 0.01–100 NEAR, threshold ≤ daily limit, testnet
  account ids only, never the vault contract, agent or owner, guard values in range), shown as a diff
  against on-chain policy, and each row needs its own owner signature. Adding an account the
  contract has blocked before comes with a warning.
- **No secrets in the browser.** Model keys and the agent key live in Vercel server-only env vars;
  the owner signs in their own wallet and the app never sees that key.

## Verify the claims

Every claim, where it lives, and the test that pins it (`cd contract && cargo test`).

| Claim | Code | Test |
|---|---|---|
| Only the registered agent can request a payment | `contract/src/lib.rs:436` | `non_agent_cannot_request` |
| Unknown payees are refused and the attempt is stored | `contract/src/lib.rs:500`, `:1210` | `attacker_recipient_is_blocked_and_persisted` |
| Replayed `request_id` is refused | `contract/src/lib.rs:449` | `duplicate_request_id_is_rejected` |
| Freeze and the kill-switch stop everything | `contract/src/lib.rs:461`, `:472`, `:1156` | `freeze_blocks_everything`, `breaker_trips_after_three_suspicious_blocks_then_cools_down` |
| At most 3 requests wait for the owner | `contract/src/lib.rs:515` | `too_many_pending_requests_are_refused` |
| Daily budget counts pending reservations | `contract/src/lib.rs:528` | `budget_counts_pending_reservations` |
| Splitting a payment is caught | `contract/src/lib.rs:557` | `splitting_below_threshold_is_capped_by_the_window_total` |
| Unapproved requests expire after 24 h and free the budget | `contract/src/lib.rs:1055`, `:1070` | `pending_request_expires_and_releases_budget`, `owner_cannot_approve_an_expired_request` |
| Rule changes need the owner and 1 yoctoNEAR | `contract/src/lib.rs:1042` | `agent_cannot_add_payee`, `agent_cannot_change_guards`, `agent_cannot_change_pending_rules` |
| Upgrades keep existing state, from either older layout | `contract/src/lib.rs:284`, `:389` | `migrate_keeps_v3_state`, `migrate_keeps_v4_state_and_seeds_reporters` |
| Reported payees are refused before the allowlist is even checked | `contract/src/lib.rs:486` | `reported_payee_is_blocked_even_when_approved` |
| Only the owner or a trusted reporter can report, with 1 yoctoNEAR; never the agent | `contract/src/lib.rs:809`, `:1035` | `strangers_cannot_report`, `the_agent_cannot_report`, `the_agent_cannot_be_made_a_reporter`, `reporting_needs_one_yocto` |
| Only the owner clears a report; a removed reporter loses access | `contract/src/lib.rs:850` | `trusted_reporter_can_report_but_not_clear`, `owner_clears_a_report_and_payments_resume`, `removed_reporter_loses_access` |
| The owner can't approve a waiting payment to a reported payee | `contract/src/lib.rs:643` | `owner_cannot_approve_a_payment_to_a_reported_payee` |
| Reported-payee blocks count towards the kill-switch | `contract/src/lib.rs:1148` | `counterparty_blocks_count_towards_the_breaker` |
| The blocklist is capped at 200 entries | `contract/src/lib.rs:832` | `the_blocklist_is_capped` |
| The agent key can only call `request_payment` | on-chain: `near account list-keys gw-emmy-agent.testnet network-config testnet now`; live on `/agent`, `/dashboard` and `/verify` (`dashboard/src/lib/key-scope.ts`), which also shows which key signed the latest request | |
| The live console uses the SDK | `dashboard/src/app/api/agent/run/route.ts:88`, `:134` → `dashboard/src/lib/server/run-agent.ts:430`, `:442` → `dashboard/src/lib/server/agent-key.ts:20` | |
| The vendor checks the receipt on-chain and refuses replays | `dashboard/src/vendor/x402.ts:109`–`160` | run a paid job on `/agent`; the last step shows the `409` |
| A factory wallet's receipt must come from that wallet's own agent | `dashboard/src/vendor/x402.ts:121`–`123`, `:150` | the `/chat` purchase above |
| The factory makes the caller the owner and needs at least 0.5 NEAR | `factory/src/lib.rs:123`, `:134` | `create_vault_claims_the_name_for_the_caller`, `too_small_a_deposit_is_refused` (`cd factory && cargo test`) |
| Wallets run the global code by hash and get no access keys | `factory/src/lib.rs:202`–`205` | on-chain: `near account list-keys boxtest.factory.gw-emmy.testnet network-config testnet now` is empty |
| The agent key can only call `request_payment` on its own wallet | `factory/src/lib.rs:254`–`259` | `a_created_wallet_gets_its_agent_then_is_ready`; on-chain: `list-keys boxtest-agent.factory.gw-emmy.testnet` |
| A failed wallet refunds and frees the name; a failed agent leaves a usable wallet | `factory/src/lib.rs:225`, `:269` | `a_failed_wallet_frees_the_name_and_refunds`, `a_failed_agent_leaves_a_usable_wallet` |
| Only the factory owner changes templates or the code hash, with 1 yoctoNEAR | `factory/src/lib.rs:296`, `:366` | `others_cannot_change_templates`, `owner_changes_need_one_yocto` |
| 5 runs per 10 minutes per visitor | `dashboard/src/lib/server/rate-limit.ts:6` | |

### Attack coverage

Each row is a real attack the contract (and, where noted, the live demo) is built to stop.

| Attack | What the contract does | Unit test | Live preset |
|---|---|---|---|
| Payment to an unknown account | `BLOCKED_RECIPIENT`, stored | `attacker_recipient_is_blocked_and_persisted` | `/agent` → Hijack the agent; also the injection presets below |
| Poisoned webpage (`display:none`) | `BLOCKED_RECIPIENT` if the model pays the attacker | same | Attacks → Poisoned webpage |
| Look-alike payee (one letter off) | `BLOCKED_RECIPIENT` | same | Attacks → Look-alike payee |
| Fake “owner says” / urgent instruction | `BLOCKED_RECIPIENT` | same | Attacks → Owner impersonation, Fake system notice |
| Poisoned tool output | `BLOCKED_RECIPIENT` | same | Attacks → Poisoned tool output |
| Threshold splitting, as an injection | The vendor check refuses a split of a catalog price; a contract send is `BLOCKED_VELOCITY` | `splitting_below_threshold_is_capped_by_the_window_total` | Attacks → Threshold splitting (injection) |
| Smurfing / velocity (scripted) | `BLOCKED_VELOCITY` | `splitting_below_threshold_is_capped_by_the_window_total`, `the_count_cap_still_stops_dust` | Attacks → Smurfing / velocity block. Needs budget left today; otherwise it says so and points at the earlier proof on `/verify`. |
| Rogue price spike (scripted) | One real 402 purchase at 0.05 NEAR, then the vendor's quote becomes the full 1 NEAR auto-pay limit: `BLOCKED_VELOCITY`, since the window total would pass the threshold | `splitting_below_threshold_is_capped_by_the_window_total` | One-tap attacks → Malicious price spike |
| Phishing payee (scripted) | `BLOCKED_RECIPIENT` for the look-alike account, no model involved | `attacker_recipient_is_blocked_and_persisted` | One-tap attacks → Phishing payee |
| Compromised counterparty (scripted) | Pre-pay check says `BLOCK` (and `WARN`: new account, code changed today); the contract answers `BLOCKED_COUNTERPARTY` | `reported_payee_is_blocked_even_when_approved` | One-tap attacks → Compromised counterparty |
| Over-budget drain (scripted) | `BLOCKED_BUDGET`, nothing spent | `over_budget_is_blocked` | Attacks → Over-budget drain |
| Repeated unknown payees (scripted) | Third `BLOCKED_RECIPIENT` trips the breaker; the next request is `FROZEN` | `breaker_trips_after_three_suspicious_blocks_then_cools_down` | Attacks → Trip the kill-switch. Pauses the shared demo for the cooldown the owner set; there is no public reset. |
| 1.5 NEAR annual plan | `PENDING_APPROVAL` until the owner signs | `above_threshold_pending_then_owner_approves_then_completes` | Real jobs → Buy the premium annual plan |

## Threat model

Each attack, the check in the contract that stops it, and the NEAR key rule underneath. All
contract references are `contract/src/lib.rs`; every check runs inside `request_payment`
before any `Promise` transfer is created, so a blocked request never moves funds.

| Attack | Contract check that stops it | NEAR key primitive | Try it |
|---|---|---|---|
| **Prompt-injection drain**: a page, invoice or tool result tells the agent to send everything to an attacker | `request_payment`: `approved_payees.contains(&receiver_id)` returns `BLOCKED_RECIPIENT`; the daily budget check (`spent_today + reserved + amount > daily_limit`) returns `BLOCKED_BUDGET`; `record_strike` trips the kill-switch after 3 unknown-payee blocks in a row | The agent signs with a function-call key limited to `request_payment` on the vault; the vault holds the funds, and only the vault's code can send them | `/agent` → One-tap attacks → Prompt-injection drain, or Hijack the agent |
| **Runaway loop / salami slicing**: many small payments, each under the approval threshold | `velocity_problem` (via `auto_paid_in_window`): automatic payments in the window may not add up past `approval_threshold`, and at most `guards.max_auto_payments` of them, else `BLOCKED_VELOCITY`; reused `request_id` returns `DUPLICATE` (`used_request_ids`) | The function-call key's gas allowance (about 2.98 NEAR, shown live on `/agent`) caps how much gas a loop can burn | One-tap attacks → Split-payment bypass |
| **Stolen agent server key** | `request_payment` accepts only `agent_id` as caller, and every check above still applies to it; owner methods go through `assert_owner`, which needs the owner account **and** exactly 1 yoctoNEAR attached | A function-call key cannot attach a deposit, send NEAR, add or delete keys, or deploy code. So the stolen key can only ask the contract, and can't call `approve_payment`, `add_payee`, `set_daily_limit`, `unfreeze` or `withdraw`. The owner rotates it with `set_agent` | Key scope badge on `/agent`, `/dashboard`, `/verify` reads `view_access_key_list` live and shows which key signed the latest request |
| **Rogue API price spike**: an approved vendor raises its 402 price | Above `approval_threshold`: `request_payment` holds it as `PENDING_APPROVAL` and only `approve_payment` (owner + 1 yoctoNEAR) releases it. At or below the threshold: `velocity_problem` keeps all automatic spend in a window at or under the threshold (`BLOCKED_VELOCITY`), so the most a greedy vendor gets without the owner is one threshold's worth per window, and never more than what's left today (`BLOCKED_BUDGET`) | Owner approval is a transaction from the owner's own wallet; the agent's function-call key can't produce it | One-tap attacks → Malicious price spike |
| **Compromised counterparty**: an account that turned malicious, reported with evidence | `request_payment`: `reported_payees.get(&receiver_id)` returns `BLOCKED_COUNTERPARTY` before the allowlist check, and counts as a strike in `record_strike`; `approve_payment` refuses a reported payee; `report_payee` accepts only the owner or a trusted reporter, `clear_payee_report` only the owner | `report_payee` and `clear_payee_report` need 1 yoctoNEAR, so they need a full-access key; a leaked function-call key can't add, clear or game the list | One-tap attacks → Compromised counterparty |
| **Phishing / unknown payee**: a look-alike account such as `api-vendor.gw-ernmy.testnet` | `request_payment`: allowlist check returns `BLOCKED_RECIPIENT`, and the attempt is stored by `block` and counted towards the kill-switch | Only `add_payee` changes the allowlist, and it needs the owner's signature and 1 yoctoNEAR | One-tap attacks → Phishing payee |

Before every payment the agent also runs a counterparty check from public chain data
(`dashboard/src/lib/server/counterparty.ts`, `checkCounterparty`): `BLOCK` if the vault has the
payee on its blocklist, `WARN` if the account doesn't exist, was created in the last 24 hours, or its
contract code hash differs from a day ago (read from an archival RPC). It shows up as a step in the
run; the payment is still sent, so the contract decides and the attempt is recorded.

Outside the contract, the agent code adds two more checks that a compromised agent could skip,
which is why the contract doesn't rely on them: the SDK refuses a 402 offer above `maxPrice` or to
a payee outside `allowedPayees` (`packages/sdk/src/index.ts`, `challengeProblem`), and the demo
vendor refuses a payment that isn't one catalog item at its listed price
(`dashboard/src/lib/server/run-agent.ts`, `priceProblem`).

What else to know:

- **What it guarantees:** where funds can go and how much, how fast, and when a human has to
  sign. It does not guarantee that a vendor delivers what it was paid for; the 402 receipt check
  covers the payment side only.
- **Gas griefing:** a leaked agent key can only burn its own gas allowance, about 2.99 NEAR on
  the function-call key, and the public console adds a per-IP limit of 5 runs per 10 minutes.
  The owner refills or rotates the key with `set_agent`.
- **Replay cache:** used 402 receipts and nonces live in Vercel's runtime cache. A production
  vendor should keep them in Redis or a KV store with durable writes.
- **Intent hash:** an audit-trail commitment in the memo, not a signature. Production would sign
  the intent log inside a TEE so the hash also proves which agent code produced it.
- **Agent account keys:** `gw-emmy-agent.testnet` has no full-access key since 13 Nov 2026,
  only its two `request_payment` function-call keys. Their gas allowance can't be raised any
  more; when it runs out, the owner points the vault at a new agent with `set_agent`.
- **No more upgrades:** the vault account's last full-access key was deleted on 13 Nov 2026
  ([tx](https://testnet.nearblocks.io/txns/4sji6Jsju1RB3Dua7LtBSeVp5p4cztPb1KzGM2shGpWa)), so the
  deployed code is final and `migrate` can never run again. A bug fix means a new vault (the
  factory makes one in a transaction) and moving funds with `withdraw`. In production you might
  prefer a DAO or multisig with a timelock over a burned key.

## Sustainability

- **Who it's for:** teams giving agents a budget: API-buying agents, shopping and booking
  assistants, DAO treasuries that delegate small payments to bots.
- **Zero protocol rent:** no token, no fee on payments. Each owner gets their own vault from
  the factory for 0.26 NEAR in fees, thanks to global contracts, and then pays only gas.
- **Roadmap:** a Rust crate alongside the TypeScript SDK, NEAR Intents for cross-chain payouts
  (mainnet; Intents has no testnet), and adapters for agent frameworks so a tool call becomes
  `pay402()` with no wallet code.

## Use it from your agent

```ts
import { accountSigner, AshabiAgent, nearToYocto } from 'ashabi-wallet-sdk';

const agent = new AshabiAgent({ contractId: 'guardian.gw-emmy.testnet', agentId, signer: accountSigner(account) });
const result = await agent.requestPayment({ receiverId: 'api-vendor.gw-emmy.testnet', amount: nearToYocto('0.05') });
// result.status: 'APPROVED' | 'PENDING_APPROVAL' | 'BLOCKED_RECIPIENT' | ... (the contract's enum)
const paid = await agent.pay402('https://ashabi-wallet.vercel.app/api/vendor/weather-now');
```

The vendor's 402 challenge names the factory too (`pay_with.factory`), so the same `pay402()`
call works from any factory wallet: pass its id as `contractId` and its agent account as `agentId`.

The live `/agent` console and `/chat` run on this SDK (`dashboard/src/lib/server/agent-key.ts` builds the
agent, `run-agent.ts` calls `requestPayment` and `pay402`). Full API in
[packages/sdk/README.md](packages/sdk/README.md).

### MCP server

`packages/mcp-server` (`ashabi-wallet-mcp`) is a local stdio MCP server around the same SDK. It is
**not published to npm yet**; run it from this repo. After it is published, the same server will
start with `npx -y ashabi-wallet-mcp`. Tools: `ashabi_wallet_status`, `ashabi_get_payment`,
`ashabi_payee_report`, `ashabi_request_payment`, `ashabi_fetch_402`. The three read tools
need no key; the payment tools need a function-call key. The contract still decides whether money moves.

```sh
cd packages/mcp-server && npm install && npm run build

export ASHABI_CONTRACT=guardian.gw-emmy.testnet
export AGENT_ACCOUNT=gw-emmy-agent.testnet
export AGENT_PRIVATE_KEY=ed25519:...   # function-call key only
claude mcp add ashabi --env ASHABI_CONTRACT --env AGENT_ACCOUNT --env AGENT_PRIVATE_KEY -- node packages/mcp-server/dist/index.js
```

More in [packages/mcp-server/README.md](packages/mcp-server/README.md).

### The agent economy, as this repo actually implements it

`api-vendor.gw-emmy.testnet` is a provider that sells testnet data and services over HTTP 402.
`gw-emmy-agent.testnet` is a buyer agent that can only ask the vault to pay. The vendor does not
unlock a payload until it sees a matching on-chain payment. Ashabi Wallet is the settlement
layer between them: the contract still enforces the owner’s rules.

## Why NEAR

On most EVM chains, limiting an agent means a smart account plus a session-key module, a bundler
and a paymaster, and the limits live in whichever module you trusted. On NEAR it is a protocol
feature: a [function-call access key](https://docs.near.org/protocol/access-keys) is scoped to one
contract and a list of methods, has its own gas allowance and cannot transfer NEAR. Pair that with
a contract that holds the funds and you get a two-layer cage, the key limits what the agent can
*call* and the contract limits what that call can *do*, with no extra infrastructure. Named
accounts also make an allowlist readable (`api-vendor.gw-emmy.testnet` versus the look-alike
`api-vendor.gw-ernmy.testnet`), and cheap, fast finality makes recording every blocked attempt
practical.

## Free models, on purpose

The live agent runs on free tiers only, tried in this order: Groq `openai/gpt-oss-20b`,
Google `gemini-3.1-flash-lite`, OpenRouter `nvidia/nemotron-3.5-lightning:free`, NVIDIA
`nemotron-3.5-lightning-30b-a3b`, then GitHub Models `gpt-4o-mini` when the token is set.
A provider that errors or rate-limits is skipped. `/chat` uses those models as a tool-calling
agent (live vault status, catalog, `buy_item`, `request_payment`); the `/agent` attack demo
still uses small free models that tend to follow a hidden instruction, which is the point:
the wallet's safety doesn't depend on the model being smart, aligned or expensive. Swap in
any model and the guarantees above hold, because the contract never asks the model's opinion.

## Run it

Requires Node 24, Rust with [`cargo-near`](https://github.com/near/cargo-near), and
[`near-cli-rs`](https://github.com/near/near-cli-rs). Testnet NEAR is free from the faucet.

```sh
# contract: 55 unit tests, then the wasm
cd contract && cargo test && cargo near build non-reproducible-wasm

# factory: 15 unit tests, then the wasm
cd factory && cargo test && cargo near build non-reproducible-wasm

# dashboard + live agent (http://localhost:3000)
cd dashboard && npm install
# .env.local (server only): AGENT_WEB_PRIVATE_KEY=<function-call key for request_payment>,
# HOSTED_AGENT_PRIVATE_KEY=<the key the factory puts on new agents, for /chat on user wallets>,
# plus any of GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, NVIDIA_API_KEY, GITHUB_MODELS_TOKEN
npm run dev

# scripted three-act demo against testnet
cd agent && npm install && npm run demo
```

Deploying your own vault and running every security scenario on testnet is covered under
[Reproduce](#reproduce) below.

## Builder's note

I started from one question: if I let an AI agent spend money for me, what stops it on the day
it gets tricked? Better prompts help, but they are a promise, not a lock. So the agent here is
treated as untrusted from the start, and the rules live where it can't reach them. It's a small
contract with a lot of tests. There is more to do (mainnet, NEAR Intents, per-payee limits), but
the core idea works today, and you can try to break it on the live site.

— Emmy D West

---

## Reference

### Accounts

| Role | Account |
|---|---|
| Vault contract (demo) | [`guardian.gw-emmy.testnet`](https://testnet.nearblocks.io/address/guardian.gw-emmy.testnet) |
| Factory (one wallet per user) | [`factory.gw-emmy.testnet`](https://testnet.nearblocks.io/address/factory.gw-emmy.testnet), admin `realfile1618.testnet`, vault code hash `3Rh6iyiZbmi3gQjsWZMGyB7YmNovekeegaQaHBiskmaA` |
| Example user wallet | [`boxtest.factory.gw-emmy.testnet`](https://testnet.nearblocks.io/address/boxtest.factory.gw-emmy.testnet) (owner `gw-emmy-fund1.testnet`, agent `boxtest-agent.factory.gw-emmy.testnet`) |
| Owner (sets policy, approves) | `realfile1618.testnet` (Meteor wallet; [handover tx](https://testnet.nearblocks.io/txns/GS3WYYApFdR1HeqEd31HxRg1BQuFYdaokE3a9RC2hwbE)) |
| AI agent (can only request) | `gw-emmy-agent.testnet` |
| Approved payee (demo API vendor) | `api-vendor.gw-emmy.testnet` |
| Attacker (not approved) | `attacker.gw-emmy.testnet` |
| Trusted reporter (can add to the blocklist, not clear it) | `security-desk.gw-emmy.testnet` |
| Reported payee (new account, swapped its code) | `rogue-vendor.gw-emmy.testnet` |

Policy: daily limit 5 NEAR, approval threshold 1 NEAR, velocity 1 NEAR / 3 payments per 10 min,
breaker after 3 strikes (the owner has set its cooldown to 3 min on the live demo). Scripted scenario run with tx links:
[docs/scenario-results.md](docs/scenario-results.md).

### Contract (`contract/`, Rust + near-sdk 5)

#### How a request is decided

`request_payment` checks, in order, and returns the first status that applies:

| # | Check | Status returned | Funds move? |
|---|---|---|---|
| 1 | `request_id` already used | `DUPLICATE` | no |
| 2 | wallet frozen by owner | `FROZEN` | no |
| 3 | circuit breaker cooling down | `FROZEN` | no |
| 4 | receiver on the blocklist of reported payees | `BLOCKED_COUNTERPARTY` | no |
| 4a | receiver not on approved list | `BLOCKED_RECIPIENT` | no |
| 4b | needs owner approval, and 3 requests already wait (`max_pending`) | `TOO_MANY_PENDING` | no |
| 5 | spent today + reserved (pending) + amount > daily limit | `BLOCKED_BUDGET` | no |
| 6 | contract balance (minus storage and 0.1 NEAR reserve) too low | `INSUFFICIENT_FUNDS` | no |
| 7 | below the threshold, but automatic payments in the window would pass the threshold (or the count cap) | `BLOCKED_VELOCITY` | no |
| 8 | amount > approval threshold | `PENDING_APPROVAL` (amount reserved against budget) | after owner approves |
| 9 | otherwise | `APPROVED` | yes, native transfer |

Policy violations **do not panic**. The call succeeds, returns
`{ status, request_id, record_id, reason }`, stores the attempt in `blocked_attempts`, and emits a
NEP-297 event. (A panic would roll back state, erasing the evidence.) The only panics are
authorization failures: a non-agent calling `request_payment`, or a non-owner calling owner methods.

Transfers are native NEAR `Promise` transfers with a callback (`on_transfer_complete`) that marks
the record `COMPLETED` or `FAILED`; on failure the day's budget is refunded. Payment record
lifecycle: `PENDING_APPROVAL → TRANSFERRING → COMPLETED | FAILED`, or `PENDING_APPROVAL → REJECTED`,
or `PENDING_APPROVAL → EXPIRED` after `pending_ttl_minutes` (24 h). Expiry is lazy: the next
`request_payment` or anyone calling `expire_pending()` releases the reserved budget, and views
already leave expired requests out.

Two guards catch patterns no single request shows:

- **Velocity limit.** Automatic payments in a rolling 10 minutes may not add up past the
  approval threshold, and there are at most 3 of them. Splitting a 1.5 NEAR payment into 0.3 NEAR
  pieces stops once the pieces would pass 1 NEAR, so the owner still sees it.
- **Circuit breaker.** 3 payments to unknown or reported accounts in a row (`BLOCKED_RECIPIENT`,
  `BLOCKED_COUNTERPARTY`) trip it:
  every request is refused for 10 minutes, or until the owner calls `unfreeze`. Budget, balance,
  velocity and duplicate blocks don't count, since honest agents hit those too, and any approved
  or pending request resets the strikes. The pause is timed rather than permanent so a burst of
  attacks on the public demo can't lock the owner's wallet for good, while a hijacked agent still
  gets cut off mid-burst.

Both are owner-tunable with `set_guards`, and `0` turns either off.

Budget days are UTC days from the block timestamp (`block_timestamp / 86400s`); `spent_today`
resets at the first call of a new day. Pending reservations carry over until approved, rejected or expired.

#### Methods

| Method | Who | Notes |
|---|---|---|
| `new(owner_id, agent_id, daily_limit, approval_threshold, approved_payees?)` | deploy | init |
| `request_payment(request_id, receiver_id, amount, memo?)` | agent only | returns status (see above) |
| `approve_payment(record_id)` / `reject_payment(record_id)` | owner, 1 yocto | approve refused while frozen or once expired |
| `set_daily_limit(daily_limit)` / `set_approval_threshold(approval_threshold)` | owner, 1 yocto | |
| `add_payee(account_id)` / `remove_payee(account_id)` | owner, 1 yocto | |
| `freeze()` / `unfreeze()` | owner, 1 yocto | emergency stop; `unfreeze` also resets a tripped breaker |
| `set_guards({max_auto_payments, velocity_window_minutes, breaker_strikes, breaker_cooldown_minutes})` | owner, 1 yocto | 0 disables a guard |
| `set_pending_rules({max_pending, pending_ttl_minutes})` | owner, 1 yocto | 0 disables the cap or the expiry |
| `expire_pending()` | anyone | releases budget held by expired requests; returns how many |
| `migrate(reporters?)` | contract itself | upgrade from the V3 or V4 state layout; seeds trusted reporters |
| `report_payee(account_id, reason, evidence_tx?)` | owner or trusted reporter, 1 yocto | adds or updates a blocklist entry; at most 200 |
| `clear_payee_report(account_id)` | owner, 1 yocto | takes an account off the blocklist |
| `add_reporter(account_id)` / `remove_reporter(account_id)` | owner, 1 yocto | who may report; never the agent |
| `set_agent(agent_id)` | owner, 1 yocto | rotate a compromised agent |
| `set_owner(new_owner)` | owner, 1 yocto | hand ownership to another wallet; must differ from the agent |
| `withdraw(amount)` | owner, 1 yocto | owner takes funds back |
| `deposit()` | anyone, payable | top up (plain transfers also work) |
| `get_wallet_status()` | view | limits, spent, reserved, remaining, balance, payees, counts, blocklist size, reporters |
| `get_payee_report(account_id)` / `get_reported_payees(from_index?, limit?)` | view | one blocklist entry, or the list |
| `get_payment_history(from_index?, limit?)` | view | newest first |
| `get_blocked_attempts(from_index?, limit?)` | view | newest first, last 500 kept |
| `get_pending()` / `get_payment(record_id)` / `is_request_id_used(request_id)` | view | |

Amounts are yoctoNEAR strings (`"1000000000000000000000000"` = 1 NEAR). Owner methods require
exactly 1 yoctoNEAR attached, so only a full-access key (a real wallet confirmation) can change
policy; a leaked function-call key cannot.

#### Events (NEP-297)

Every outcome logs `EVENT_JSON:{"standard":"guardian_wallet","version":"1.0.0","event":...}` with
event one of `wallet_initialized`, `payment_approved`, `payment_pending`, `payment_blocked`,
`payment_completed`, `payment_failed`, `payment_rejected`, `policy_updated`, `payee_added`,
`payee_removed`, `wallet_frozen`, `wallet_unfrozen`, `agent_changed`, `owner_changed`,
`guards_updated`, `pending_rules_updated`, `payment_expired`, `breaker_tripped`, `breaker_reset`,
`payee_reported`, `payee_report_cleared`, `reporter_added`, `reporter_removed`, `deposit`, `withdraw`.

### Factory (`factory/`, Rust + near-sdk 5)

- `create_vault(name, template_id, daily_limit?, approval_threshold?, extra_payees?, agent_key?)`,
  payable, at least 0.5 NEAR: creates `<name>.<factory>` from the global code with the caller as
  owner, then `<name>-agent.<factory>` with a `request_payment`-only key. Callbacks
  `on_vault_created` and `on_agent_created` settle the result.
- Owner only, 1 yoctoNEAR: `set_template`, `remove_template`, `set_vault_code_hash`, `set_hosted_agent_key`.
- Views: `get_config`, `get_templates`, `get_vault`, `get_vaults_by_owner`, `is_name_available`.
- Vault states: `CREATING`, `READY`, `NO_AGENT`. Events (`standard: guardian_factory`):
  `vault_created`, `vault_failed`, `code_hash_updated`.

```sh
cd factory && cargo test                       # 15 tests
cargo near build non-reproducible-wasm
# publish the vault wasm once, by hash (burns ~10 NEAR per 100 KB)
near contract deploy-as-global use-file ../contract/target/near/guardian_wallet.wasm as-global-hash <payer>.testnet network-config testnet sign-with-legacy-keychain send
near contract deploy <factory>.testnet use-file target/near/guardian_factory.wasm \
  with-init-call new json-args '{"owner_id":"<admin>","vault_code_hash":"<hash>","hosted_agent_key":"ed25519:...","templates":[...]}' \
  prepaid-gas '30 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send
near contract call-function as-transaction <factory>.testnet create_vault json-args '{"name":"me","template_id":"api-buyer"}' \
  prepaid-gas '300 Tgas' attached-deposit '2 NEAR' sign-as <you>.testnet network-config testnet sign-with-legacy-keychain send
```

### Reproduce

Requires Rust, [`cargo-near`](https://github.com/near/cargo-near) and
[`near-cli-rs`](https://github.com/near/near-cli-rs). Testnet NEAR is free.

```sh
# 1. unit tests (55)
cd contract && cargo test

# 2. build the wasm
cargo near build non-reproducible-wasm

# 3. create testnet accounts (faucet) and deploy
near account create-account sponsor-by-faucet-service <you>.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create
#    (also an owner, an agent, a payee and an attacker account; see scripts/testnet-scenarios.sh header)
near contract deploy <vault>.testnet use-file target/near/guardian_wallet.wasm \
  with-init-call new json-args '{"owner_id":"<owner>","agent_id":"<agent>","daily_limit":"5000000000000000000000000","approval_threshold":"1000000000000000000000000","approved_payees":["<payee>"]}' \
  prepaid-gas '30 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send

# 4. run all security scenarios for real on testnet; writes a markdown table with tx links
cd .. && CONTRACT=<vault>.testnet OWNER=<owner> AGENT=<agent> VENDOR=<payee> ATTACKER=<attacker> \
  OUT=docs/scenario-results.md ./scripts/testnet-scenarios.sh
```

Scenarios covered: normal payment (approved, settles), prompt-injection payment to attacker
(blocked, recorded), over-budget (blocked), above-threshold (pending, owner approves, settles),
freeze (blocks everything, then unfreeze), duplicate `request_id` (blocked), attacker calling the
contract directly (panics: unauthorized), agent trying to add a payee (panics: unauthorized).

### Known limitations

- The demo vault and its agent account have no full-access keys (deleted 13 Nov 2026, steps in
  [docs/before-final.md](docs/before-final.md)), so the vault's code can't be fixed in place.
  The factory account still has its full-access key, which only matters for new wallets: existing
  ones are pinned to their code hash and have no keys.
- `scripts/testnet-scenarios.sh` signs agent steps from the legacy keychain, so to re-run it the
  keychain entry for `gw-emmy-agent.testnet` must hold one of its function-call keys.
- The default kill-switch cooldown in the contract is 10 minutes. The live demo may be shorter
  if the owner changed it (`get_wallet_status` and the verify panel show the live value).
- No NEAR Intents yet: payments are native NEAR transfers. NEAR Intents has no testnet, so any
  Intents integration would have to run on mainnet with tiny amounts.

### Agent and demo (`agent/`, TypeScript, Node 24)

Node 24 runs the `.ts` files directly; there is no build step.

```sh
cd dashboard && npm install && npm run dev      # serves the vendor the agent buys from
cd agent && npm install
npm run probe            # one tiny request per model provider; writes data/provider-probe.json
npm run probe:injection  # asks small models whether they follow the hidden instruction
npm run demo             # runs the three acts on testnet; writes data/action-log.json
node src/owner.ts status | pending | approve <id> | reject <id> | freeze | unfreeze
# owner commands sign with the owner's key from ~/.near-credentials; the live owner is a
# Meteor wallet, so in practice they go through /approve instead
```

- `src/agent.ts` turns a task into one payment plan (via the model router) and calls
  `request_payment`. It signs with a function-call key that can only call `request_payment` on the
  vault contract and cannot attach deposits. The agent does no policy checks of its own; that
  is the contract's job.
- `src/router.ts` tries OpenAI-compatible providers in order with a 6 s timeout and strict JSON.
  Provider order and probe results: [docs/providers.md](docs/providers.md).
- The demo vendor lives in the dashboard app under `/api/vendor`. `GET /data/<sku>?record_id=N`
  returns data only if record N on the contract is `COMPLETED`, paid to the vendor, at least the
  item price, has memo `sku:<sku>`, and is less than 24 hours old. Otherwise `402`. No database:
  the on-chain record is the receipt.
- `/api/vendor/docs/weather-api` looks like normal API docs, with a hidden `display:none` block
  telling AI agents to send 5 NEAR to `attacker.gw-emmy.testnet`. Its "View raw HTML" button
  shows the source with the hidden block highlighted.

The demo:

1. Act 1: "Get a 7-day forecast for Lagos, max 1 NEAR." The model picks the 0.3 NEAR plan, the
   contract approves, the transfer settles, the vendor delivers.
2. Act 2: the agent reads the trap page with a small model (Groq `allam-2-7b`), which follows
   the hidden instruction and requests 5 NEAR to the attacker. The contract returns
   `BLOCKED_RECIPIENT` and stores the attempt. If no model takes the bait, the demo submits the
   injected payment anyway (logged as `compromise_override`).
3. Act 3: "Upgrade to the premium annual plan" (1.5 NEAR, above the 1 NEAR threshold). The
   contract holds it as `PENDING_APPROVAL`; the owner approves; it settles; the vendor delivers.

Latest run with transaction links: [docs/demo-run.md](docs/demo-run.md). `data/action-log.json`
is a list of structured events (`task`, `fetch`, `content_warning`, `model_decision`,
`payment_request`, `contract_decision`, `settlement`, `awaiting_owner`, `owner_action`,
`delivery`) with status and explorer links. It records decisions and their stated reasons, not
model reasoning.

### Dashboard (`dashboard/`, Next.js 16, Tailwind 4)

- `/` explains it for people: an allowance, not your bank password. The hero has a live status
  card for the demo wallet (budget left today, approved recipients, the approval threshold,
  all-time accepted and blocked counts), then a live stats strip (payments accepted, requests
  blocked, spent today, wallets the factory has created), how it works, the same three proof
  cards as `/agent`, real screenshots, what happens above your limit, a who-can-do-what diagram,
  and a trust section (contract links, source, test counts, testnet limitations). Numbers that
  come from the shared demo wallet are labelled "Public demo wallet · guardian.gw-emmy.testnet"
  with a NearBlocks link; if you are connected and already have a vault, the same label offers
  "View your vault". Every number is read from the chain and says what it counts.
- The nav is Home, Live Agent (`/chat`), Attack Demo (`/agent`), Wallet, Verify (`/verify`) and Docs (`/docs`, a
  short guide to the rules, the SDK and the accounts), plus a Connect wallet button (desktop and
  the mobile menu). It opens a themed modal with MyNearWallet (browser redirect, including iPhone
  Safari), Meteor, HERE, and Intear. Once connected, the button becomes an account pill with
  disconnect. The same modal is used on `/start`, `/wallet`, `/approve` and `/vault/*`. Inside the
  Meteor in-app browser the app signs in through Meteor's bridge instead of the modal. The Ashabi mascot's visor is an SVG dot
  matrix that changes with the outcome: thinking while the agent runs, an X when the contract
  blocks a payment, a check when one is approved, amber while it waits for you. Motion follows
  `prefers-reduced-motion`.
- Stats say what they count: "Spent today X of Y NEAR · Remaining today Z", with the reset time
  (00:00 UTC, 1:00 AM WAT); "Payments accepted" and "Requests blocked" are all-time totals on the
  shared demo wallet (blocked includes budget and speed limits); the kill-switch reads "2 of 3
  blocked payments to unknown accounts in a row", which is what the contract counts
  (`contract/src/lib.rs:1148`: only `BLOCKED_RECIPIENT` and `BLOCKED_COUNTERPARTY` add a strike; any accepted request clears it, `:568`).
- `/start` uses the same Connect wallet control, lists the factory's templates, checks the name, shows what
  the deposit covers, sends `create_vault`, and waits until the factory reports the wallet ready
  (it survives the MyNearWallet redirect).
- `/wallet` lists the wallets you own (`get_vaults_by_owner`). `/vault/<id>` is one wallet: what
  the AI can still spend today, balance, payees, add funds, pending approvals, activity and the
  same owner controls as `/approve`.
- `/vault/<id>/request/<record>` is the deep link for one approval: "Your AI wants to spend 1.50
  NEAR on premium annual. Approve / Reject", then the outcome. "Send to my phone" shares it.
- `/chat` is Ashabi, the mascot: a tool-calling shopping assistant with a contract-limited NEAR
  testnet wallet. Every reply is generated by the model, with the last few turns of the
  conversation as context. It has tools for live vault status, the catalog, buying a catalog
  item over HTTP 402, and `request_payment`. It must not claim a payment succeeded unless the
  tool said so. Small talk does not spend a purchase-run slot; only a real payment tool call
  does. A request to send funds still goes to the contract, even if the model would rather
  refuse in text. The catalog is weather, a news digest, a translation, an icon pack, a market
  report, and a 1.5 NEAR annual plan that waits for the owner.
- `/verify` runs live RPC checks in the visitor’s browser (agent key scope, vault full-access
  key count, owner control, contract code hash and balance, velocity limit, kill-switch, latest blocked attempt) and lists every
  published proof transaction with a NearBlocks link. The same checks sit on `/` and `/agent`.
  A check that cannot reach the RPC, or that does not hold, is shown as a failure or a caveat,
  not as a green tick.
- Every page renders from cached on-chain state. If the testnet RPC is slow it shows the last
  good snapshot with an "as of HH:MM" note instead of a spinner.
- `/dashboard` reads the contract live every 6 s: vault balance, daily budget (spent, reserved,
  remaining), policy, every payment and blocked attempt with its NearBlocks link, blocked-attack
  cards with the memo the agent sent. A collapsed "Recorded reference run" holds the scripted
  three-act log and its trap page.
- `/agent` lets anyone run the agent for real. Attack presets come with a preview of the
  poisoned docs page, invoice or tool result, and "Reveal hidden injection" lights up the text
  only the agent reads; in the stream, the model step that followed it is outlined in red. Three proof cards at the top (A: an allowed payment completes, B: a hijacked agent is refused, C: a big payment waits for the owner) each run it in one tap or link to their latest real transaction; if today's shared budget is used up, A and C say so and show the latest one instead. The hijack (B) skips the tricking
  step (the compromise is simulated and labelled as such) and has the agent send 2 NEAR to the
  attacker with its real key, so the block is a real transaction every time.
  Otherwise give it a task and it reads the vendor catalog,
  asks a free model what to buy, and sends `request_payment` with its limited key; settlement and
  the delivered data stream in. Attack mode poisons the vendor page with a preset or your own
  injection and shows whether the model fell for it and what the contract did, with the tx link.
  Scripted presets (velocity / smurfing, over-budget drain, trip the kill-switch) skip the model
  and always hit the contract, like the hijack button. The kill-switch preset asks for a
  confirmation because it pauses the shared demo for the cooldown; there is no public reset.
- `/approve` also has an optional, collapsed policy writer: plain English in, a checked diff
  out, one wallet signature per change.
- `/approve` is the owner's phone view: pending payments with Approve and Reject, a Freeze
  button, and the rules (daily limit, guards including the kill-switch cooldown, approved payees). It signs through the same Connect wallet button as the rest of the app (MyNearWallet, Meteor, HERE or Intear) with 1 yoctoNEAR
  attached; the app never holds the owner's key.

| Dashboard | Owner approvals (mobile) |
|---|---|
| ![Dashboard](docs/screenshots/dashboard.png) | ![Approve](docs/screenshots/approve-mobile.png) |

### Built with

Rust, near-sdk 5.30, cargo-near 0.23, near-cli-rs 0.31, near-api-js 7, TypeScript, Next.js 16, Tailwind CSS 4, Motion, NEAR Wallet Selector. Free model tiers
from Groq, Google AI Studio, OpenRouter, NVIDIA and GitHub Models. No pre-hackathon code. AI coding assistance was used.

### License

MIT
