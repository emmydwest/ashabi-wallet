# Guardian Wallet

**Give AI the freedom to act. Never the freedom to overspend.**

Guardian Wallet is an on-chain spending policy for AI agents on NEAR. The AI agent can only
*request* payments. A NEAR smart contract holds the funds and enforces the owner's rules: payee
allowlist, daily budget, approval threshold, emergency freeze and replay protection. Even a fully
compromised agent (for example, one hit by a prompt injection) cannot spend outside those rules,
and every blocked attempt is stored on-chain where anyone can check it.

Built at NEAR HACKATHON (Nov 2026). Tracks: AI Security & Defense, Agent Economy.

> Status: Day 1 — contract deployed and tested on NEAR testnet. Agent, dashboard and demo pages come next.

## Live on testnet

| Role | Account |
|---|---|
| Guardian contract | [`guardian.gw-emmy.testnet`](https://testnet.nearblocks.io/address/guardian.gw-emmy.testnet) |
| Owner (sets policy, approves) | `gw-emmy-owner.testnet` |
| AI agent (can only request) | `gw-emmy-agent.testnet` |
| Approved payee (demo API vendor) | `api-vendor.gw-emmy.testnet` |
| Attacker (not approved) | `attacker.gw-emmy.testnet` |

Policy: daily limit 5 NEAR, approval threshold 1 NEAR. Latest scenario run with transaction links:
[docs/scenario-results.md](docs/scenario-results.md).

Try it without any keys (read-only):

```sh
near contract call-function as-read-only guardian.gw-emmy.testnet get_wallet_status json-args '{}' network-config testnet now
near contract call-function as-read-only guardian.gw-emmy.testnet get_blocked_attempts json-args '{"limit":5}' network-config testnet now
near contract call-function as-read-only guardian.gw-emmy.testnet get_payment_history json-args '{"limit":5}' network-config testnet now
```

You should see the policy, the attacker's blocked attempts (`BLOCKED_RECIPIENT`, with the injected memo), and completed payments.

## Contract (`contract/`, Rust + near-sdk 5)

### How a request is decided

`request_payment` checks, in order, and returns the first status that applies:

| # | Check | Status returned | Funds move? |
|---|---|---|---|
| 1 | `request_id` already used | `DUPLICATE` | no |
| 2 | wallet frozen by owner | `FROZEN` | no |
| 3 | receiver not on approved list | `BLOCKED_RECIPIENT` | no |
| 4 | spent today + reserved (pending) + amount > daily limit | `BLOCKED_BUDGET` | no |
| 5 | contract balance (minus storage and 0.1 NEAR reserve) too low | `INSUFFICIENT_FUNDS` | no |
| 6 | amount > approval threshold | `PENDING_APPROVAL` (amount reserved against budget) | after owner approves |
| 7 | otherwise | `APPROVED` | yes, native transfer |

Policy violations **do not panic**. The call succeeds, returns
`{ status, request_id, record_id, reason }`, stores the attempt in `blocked_attempts`, and emits a
NEP-297 event. (A panic would roll back state, erasing the evidence.) The only panics are
authorization failures: a non-agent calling `request_payment`, or a non-owner calling owner methods.

Transfers are native NEAR `Promise` transfers with a callback (`on_transfer_complete`) that marks
the record `COMPLETED` or `FAILED`; on failure the day's budget is refunded. Payment record
lifecycle: `PENDING_APPROVAL → TRANSFERRING → COMPLETED | FAILED`, or `PENDING_APPROVAL → REJECTED`.

Budget days are UTC days from the block timestamp (`block_timestamp / 86400s`); `spent_today`
resets at the first call of a new day. Pending reservations carry over until approved or rejected.

### Methods

| Method | Who | Notes |
|---|---|---|
| `new(owner_id, agent_id, daily_limit, approval_threshold, approved_payees?)` | deploy | init |
| `request_payment(request_id, receiver_id, amount, memo?)` | agent only | returns status (see above) |
| `approve_payment(record_id)` / `reject_payment(record_id)` | owner, 1 yocto | approve refused while frozen |
| `set_daily_limit(daily_limit)` / `set_approval_threshold(approval_threshold)` | owner, 1 yocto | |
| `add_payee(account_id)` / `remove_payee(account_id)` | owner, 1 yocto | |
| `freeze()` / `unfreeze()` | owner, 1 yocto | emergency stop |
| `set_agent(agent_id)` | owner, 1 yocto | rotate a compromised agent |
| `withdraw(amount)` | owner, 1 yocto | owner takes funds back |
| `deposit()` | anyone, payable | top up (plain transfers also work) |
| `get_wallet_status()` | view | limits, spent, reserved, remaining, balance, payees, counts |
| `get_payment_history(from_index?, limit?)` | view | newest first |
| `get_blocked_attempts(from_index?, limit?)` | view | newest first, last 500 kept |
| `get_pending()` / `get_payment(record_id)` / `is_request_id_used(request_id)` | view | |

Amounts are yoctoNEAR strings (`"1000000000000000000000000"` = 1 NEAR). Owner methods require
exactly 1 yoctoNEAR attached, so only a full-access key (a real wallet confirmation) can change
policy; a leaked function-call key cannot.

### Events (NEP-297)

Every outcome logs `EVENT_JSON:{"standard":"guardian_wallet","version":"1.0.0","event":...}` with
event one of `wallet_initialized`, `payment_approved`, `payment_pending`, `payment_blocked`,
`payment_completed`, `payment_failed`, `payment_rejected`, `policy_updated`, `payee_added`,
`payee_removed`, `wallet_frozen`, `wallet_unfrozen`, `agent_changed`, `deposit`, `withdraw`.

### Reproduce

Requires Rust, [`cargo-near`](https://github.com/near/cargo-near) and
[`near-cli-rs`](https://github.com/near/near-cli-rs). Testnet NEAR is free.

```sh
# 1. unit tests (16)
cd contract && cargo test

# 2. build the wasm
cargo near build non-reproducible-wasm

# 3. create testnet accounts (faucet) and deploy
near account create-account sponsor-by-faucet-service <you>.testnet autogenerate-new-keypair save-to-legacy-keychain network-config testnet create
#    (also an owner, an agent, a payee and an attacker account; see scripts/testnet-scenarios.sh header)
near contract deploy <guardian>.testnet use-file target/near/guardian_wallet.wasm \
  with-init-call new json-args '{"owner_id":"<owner>","agent_id":"<agent>","daily_limit":"5000000000000000000000000","approval_threshold":"1000000000000000000000000","approved_payees":["<payee>"]}' \
  prepaid-gas '30 Tgas' attached-deposit '0 NEAR' network-config testnet sign-with-legacy-keychain send

# 4. run all security scenarios for real on testnet; writes a markdown table with tx links
cd .. && CONTRACT=<guardian>.testnet OWNER=<owner> AGENT=<agent> VENDOR=<payee> ATTACKER=<attacker> \
  OUT=docs/scenario-results.md ./scripts/testnet-scenarios.sh
```

Scenarios covered: normal payment (approved, settles), prompt-injection payment to attacker
(blocked, recorded), over-budget (blocked), above-threshold (pending, owner approves, settles),
freeze (blocks everything, then unfreeze), duplicate `request_id` (blocked), attacker calling the
contract directly (panics: unauthorized), agent trying to add a payee (panics: unauthorized).

### Known limitations

- The contract account still has a full-access key during development, so whoever holds it could
  redeploy the contract. Before the final demo the plan is to remove that key (or hand upgrades to
  the owner) so the funds are governed only by the code.
- No NEAR Intents yet: payments are native NEAR transfers. NEAR Intents has no testnet, so any
  Intents integration would have to run on mainnet with tiny amounts.

## Built with

Rust, near-sdk 5.30, cargo-near 0.23, near-cli-rs 0.31. No pre-hackathon code. AI coding assistance was used.

## License

MIT
