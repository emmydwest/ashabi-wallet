//! Guardian Wallet — an on-chain spending policy for AI agents.
//!
//! The contract custodies the funds. The AI agent can only *request* payments;
//! every request is checked against owner-set policy (freeze, payee allowlist,
//! daily budget incl. reservations, approval threshold, replay protection).
//! Policy violations never panic: they return a status, are persisted in state
//! and emitted as NEP-297 events, so blocked attacks stay visible on-chain.
//! Only authorization failures (wrong caller) panic.

use near_sdk::json_types::U128;
use near_sdk::serde::{Deserialize, Serialize};
use near_sdk::serde_json::json;
use near_sdk::store::{IterableSet, LookupSet, Vector};
use near_sdk::{
    env, near, require, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise,
};

pub const NANOS_PER_DAY: u64 = 86_400 * 1_000_000_000;
pub const MAX_REQUEST_ID_LEN: usize = 64;
pub const MAX_MEMO_LEN: usize = 256;
/// Max blocked attempts kept with full details (ring buffer); total count is unbounded.
/// Caps the storage a compromised agent can burn by spamming bad requests.
pub const MAX_STORED_BLOCKED: u32 = 500;
/// Balance kept back on top of storage staking so the contract can never be drained.
pub const SAFETY_RESERVE: NearToken = NearToken::from_millinear(100);
const GAS_FOR_CALLBACK: Gas = Gas::from_tgas(10);
const EVENT_STANDARD: &str = "guardian_wallet";
const EVENT_VERSION: &str = "1.0.0";

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    Payees,
    Records,
    Pending,
    Blocked,
    UsedRequestIds,
}

/// Outcome of `request_payment`.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RequestStatus {
    Approved,
    PendingApproval,
    BlockedRecipient,
    BlockedBudget,
    InsufficientFunds,
    Frozen,
    Duplicate,
}

/// Lifecycle of a payment record.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PaymentStatus {
    /// Waiting for the owner.
    PendingApproval,
    /// Transfer promise scheduled, callback not yet received.
    Transferring,
    Completed,
    /// Transfer failed; budget refunded.
    Failed,
    /// Owner rejected the pending payment; reservation released.
    Rejected,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct PaymentRecord {
    pub id: u64,
    pub request_id: String,
    pub receiver_id: AccountId,
    pub amount: U128,
    pub memo: String,
    pub status: PaymentStatus,
    pub created_at: u64,
    pub updated_at: u64,
    /// Day index (block_timestamp / 1 day) whose budget this payment is charged to.
    pub budget_day: u64,
    pub approved_by_owner: bool,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct BlockedAttempt {
    pub seq: u64,
    pub request_id: String,
    pub caller: AccountId,
    pub receiver_id: AccountId,
    pub amount: U128,
    pub memo: String,
    pub status: RequestStatus,
    pub reason: String,
    pub timestamp: u64,
}

#[near(serializers = [json])]
#[derive(Clone, Debug)]
pub struct RequestOutcome {
    pub status: RequestStatus,
    pub request_id: String,
    pub record_id: Option<u64>,
    pub reason: String,
}

#[near(serializers = [json])]
pub struct WalletStatus {
    pub owner_id: AccountId,
    pub agent_id: AccountId,
    pub frozen: bool,
    pub daily_limit: U128,
    pub approval_threshold: U128,
    pub spent_today: U128,
    pub reserved: U128,
    pub remaining_today: U128,
    pub current_day: u64,
    pub balance: U128,
    pub available_balance: U128,
    pub approved_payees: Vec<AccountId>,
    pub pending_count: u32,
    pub payment_count: u32,
    pub blocked_count: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct GuardianWallet {
    owner_id: AccountId,
    agent_id: AccountId,
    daily_limit: u128,
    approval_threshold: u128,
    spent_today: u128,
    /// Day index that `spent_today` belongs to.
    current_day: u64,
    /// Sum of pending-approval amounts (counted against the budget).
    reserved: u128,
    frozen: bool,
    approved_payees: IterableSet<AccountId>,
    payment_records: Vector<PaymentRecord>,
    pending: IterableSet<u64>,
    blocked_attempts: Vector<BlockedAttempt>,
    blocked_total: u64,
    used_request_ids: LookupSet<String>,
}

fn emit(event: &str, data: near_sdk::serde_json::Value) {
    let ev = json!({
        "standard": EVENT_STANDARD,
        "version": EVENT_VERSION,
        "event": event,
        "data": [data],
    });
    env::log_str(&format!("EVENT_JSON:{}", ev));
}

fn day_of(ts: u64) -> u64 {
    ts / NANOS_PER_DAY
}

#[near]
impl GuardianWallet {
    #[init]
    pub fn new(
        owner_id: AccountId,
        agent_id: AccountId,
        daily_limit: U128,
        approval_threshold: U128,
        approved_payees: Option<Vec<AccountId>>,
    ) -> Self {
        require!(owner_id != agent_id, "owner and agent must differ");
        let mut c = Self {
            owner_id,
            agent_id,
            daily_limit: daily_limit.0,
            approval_threshold: approval_threshold.0,
            spent_today: 0,
            current_day: day_of(env::block_timestamp()),
            reserved: 0,
            frozen: false,
            approved_payees: IterableSet::new(StorageKey::Payees),
            payment_records: Vector::new(StorageKey::Records),
            pending: IterableSet::new(StorageKey::Pending),
            blocked_attempts: Vector::new(StorageKey::Blocked),
            blocked_total: 0,
            used_request_ids: LookupSet::new(StorageKey::UsedRequestIds),
        };
        for p in approved_payees.unwrap_or_default() {
            c.approved_payees.insert(p);
        }
        emit(
            "wallet_initialized",
            json!({
                "owner_id": c.owner_id, "agent_id": c.agent_id,
                "daily_limit": U128(c.daily_limit), "approval_threshold": U128(c.approval_threshold),
            }),
        );
        c
    }

    /// Accept plain deposits (anyone can top up the guardian).
    #[payable]
    pub fn deposit(&mut self) {
        emit(
            "deposit",
            json!({ "from": env::predecessor_account_id(), "amount": U128(env::attached_deposit().as_yoctonear()) }),
        );
    }

    // ------------------------------------------------------------------ agent

    /// The only spending entry point for the AI agent. Never panics on policy
    /// violations; only panics if the caller is not the registered agent or the
    /// arguments are malformed.
    pub fn request_payment(
        &mut self,
        request_id: String,
        receiver_id: AccountId,
        amount: U128,
        memo: Option<String>,
    ) -> RequestOutcome {
        require!(
            env::predecessor_account_id() == self.agent_id,
            "Unauthorized: only the registered agent can request payments"
        );
        require!(
            !request_id.is_empty() && request_id.len() <= MAX_REQUEST_ID_LEN,
            "request_id must be 1..=64 chars"
        );
        require!(amount.0 > 0, "amount must be > 0");
        let memo = memo.unwrap_or_default();
        require!(memo.len() <= MAX_MEMO_LEN, "memo too long (max 256 bytes)");
        self.roll_day();

        // 1. Replay protection. A duplicate is logged but does not consume the id again.
        if self.used_request_ids.contains(&request_id) {
            return self.block(
                request_id,
                receiver_id,
                amount,
                memo,
                RequestStatus::Duplicate,
                "request_id already used".into(),
            );
        }
        self.used_request_ids.insert(request_id.clone());

        // 2. Emergency freeze.
        if self.frozen {
            return self.block(
                request_id,
                receiver_id,
                amount,
                memo,
                RequestStatus::Frozen,
                "wallet is frozen by owner".into(),
            );
        }
        // 3. Payee allowlist.
        if !self.approved_payees.contains(&receiver_id) {
            return self.block(
                request_id,
                receiver_id.clone(),
                amount,
                memo,
                RequestStatus::BlockedRecipient,
                format!(
                    "recipient {} is not on the approved payee list; funds not transferred",
                    receiver_id
                ),
            );
        }
        // 4. Daily budget (spent + reserved for pending + this request).
        let committed = self.spent_today + self.reserved;
        if committed
            .checked_add(amount.0)
            .map_or(true, |t| t > self.daily_limit)
        {
            let remaining = self.daily_limit.saturating_sub(committed);
            return self.block(
                request_id,
                receiver_id,
                amount,
                memo,
                RequestStatus::BlockedBudget,
                format!(
                    "exceeds daily budget: requested {} yocto, remaining {} yocto",
                    amount.0, remaining
                ),
            );
        }
        // 5. Funds actually held (minus storage + safety reserve + pending reservations).
        if amount.0 > self.available_balance().saturating_sub(self.reserved) {
            return self.block(
                request_id,
                receiver_id,
                amount,
                memo,
                RequestStatus::InsufficientFunds,
                "contract balance too low for this payment".into(),
            );
        }

        let now = env::block_timestamp();
        let id = self.payment_records.len() as u64;
        let needs_approval = amount.0 > self.approval_threshold;
        let record = PaymentRecord {
            id,
            request_id: request_id.clone(),
            receiver_id: receiver_id.clone(),
            amount,
            memo: memo.clone(),
            status: if needs_approval {
                PaymentStatus::PendingApproval
            } else {
                PaymentStatus::Transferring
            },
            created_at: now,
            updated_at: now,
            budget_day: self.current_day,
            approved_by_owner: false,
        };
        self.payment_records.push(record);

        if needs_approval {
            self.reserved += amount.0;
            self.pending.insert(id);
            emit(
                "payment_pending",
                json!({
                    "record_id": id, "request_id": request_id, "receiver_id": receiver_id,
                    "amount": amount, "memo": memo, "approval_threshold": U128(self.approval_threshold),
                }),
            );
            RequestOutcome {
                status: RequestStatus::PendingApproval,
                request_id,
                record_id: Some(id),
                reason: "amount above approval threshold; waiting for owner".into(),
            }
        } else {
            self.spent_today += amount.0;
            emit(
                "payment_approved",
                json!({
                    "record_id": id, "request_id": request_id, "receiver_id": receiver_id,
                    "amount": amount, "memo": memo, "by": "policy",
                }),
            );
            self.transfer(id, receiver_id, amount.0);
            RequestOutcome {
                status: RequestStatus::Approved,
                request_id,
                record_id: Some(id),
                reason: "within policy; transfer scheduled".into(),
            }
        }
    }

    // ------------------------------------------------------------------ owner

    /// Owner approves a pending payment. Budget was already reserved at request time.
    #[payable]
    pub fn approve_payment(&mut self, record_id: u64) {
        self.assert_owner();
        require!(!self.frozen, "wallet is frozen; unfreeze before approving");
        require!(
            self.pending.contains(&record_id),
            "no pending payment with this id"
        );
        self.roll_day();
        let mut rec = self
            .payment_records
            .get(record_id as u32)
            .cloned()
            .expect("record missing");
        require!(
            rec.amount.0
                <= self
                    .available_balance()
                    .saturating_sub(self.reserved - rec.amount.0),
            "contract balance too low for this payment"
        );
        self.pending.remove(&record_id);
        self.reserved -= rec.amount.0;
        self.spent_today += rec.amount.0;
        rec.status = PaymentStatus::Transferring;
        rec.approved_by_owner = true;
        rec.budget_day = self.current_day;
        rec.updated_at = env::block_timestamp();
        let (to, amt) = (rec.receiver_id.clone(), rec.amount.0);
        self.payment_records.replace(record_id as u32, rec);
        emit(
            "payment_approved",
            json!({
                "record_id": record_id, "receiver_id": to, "amount": U128(amt), "by": "owner",
            }),
        );
        self.transfer(record_id, to, amt);
    }

    #[payable]
    pub fn reject_payment(&mut self, record_id: u64) {
        self.assert_owner();
        require!(
            self.pending.remove(&record_id),
            "no pending payment with this id"
        );
        let mut rec = self
            .payment_records
            .get(record_id as u32)
            .cloned()
            .expect("record missing");
        self.reserved -= rec.amount.0;
        rec.status = PaymentStatus::Rejected;
        rec.updated_at = env::block_timestamp();
        let (to, amt) = (rec.receiver_id.clone(), rec.amount);
        self.payment_records.replace(record_id as u32, rec);
        emit(
            "payment_rejected",
            json!({ "record_id": record_id, "receiver_id": to, "amount": amt }),
        );
    }

    #[payable]
    pub fn set_daily_limit(&mut self, daily_limit: U128) {
        self.assert_owner();
        self.daily_limit = daily_limit.0;
        emit("policy_updated", json!({ "daily_limit": daily_limit }));
    }

    #[payable]
    pub fn set_approval_threshold(&mut self, approval_threshold: U128) {
        self.assert_owner();
        self.approval_threshold = approval_threshold.0;
        emit(
            "policy_updated",
            json!({ "approval_threshold": approval_threshold }),
        );
    }

    #[payable]
    pub fn add_payee(&mut self, account_id: AccountId) {
        self.assert_owner();
        self.approved_payees.insert(account_id.clone());
        emit("payee_added", json!({ "account_id": account_id }));
    }

    #[payable]
    pub fn remove_payee(&mut self, account_id: AccountId) {
        self.assert_owner();
        self.approved_payees.remove(&account_id);
        emit("payee_removed", json!({ "account_id": account_id }));
    }

    #[payable]
    pub fn freeze(&mut self) {
        self.assert_owner();
        self.frozen = true;
        emit(
            "wallet_frozen",
            json!({ "by": env::predecessor_account_id() }),
        );
    }

    #[payable]
    pub fn unfreeze(&mut self) {
        self.assert_owner();
        self.frozen = false;
        emit(
            "wallet_unfrozen",
            json!({ "by": env::predecessor_account_id() }),
        );
    }

    /// Rotate the agent key/account (e.g. after a compromise).
    #[payable]
    pub fn set_agent(&mut self, agent_id: AccountId) {
        self.assert_owner();
        require!(agent_id != self.owner_id, "owner and agent must differ");
        self.agent_id = agent_id.clone();
        emit("agent_changed", json!({ "agent_id": agent_id }));
    }

    /// Owner pulls funds out; not subject to agent policy.
    #[payable]
    pub fn withdraw(&mut self, amount: U128) -> Promise {
        self.assert_owner();
        require!(
            amount.0 <= self.available_balance().saturating_sub(self.reserved),
            "amount exceeds available balance"
        );
        emit("withdraw", json!({ "to": self.owner_id, "amount": amount }));
        Promise::new(self.owner_id.clone()).transfer(NearToken::from_yoctonear(amount.0))
    }

    // ------------------------------------------------------------------ callback

    #[private]
    pub fn on_transfer_complete(&mut self, record_id: u64) -> bool {
        let ok = env::promise_results_count() == 1 && env::promise_result_checked(0, 0).is_ok();
        let mut rec = self
            .payment_records
            .get(record_id as u32)
            .cloned()
            .expect("record missing");
        rec.updated_at = env::block_timestamp();
        if ok {
            rec.status = PaymentStatus::Completed;
            emit(
                "payment_completed",
                json!({
                    "record_id": record_id, "receiver_id": rec.receiver_id, "amount": rec.amount,
                }),
            );
        } else {
            rec.status = PaymentStatus::Failed;
            // Refund the budget if the failure lands on the same budget day.
            self.roll_day();
            if rec.budget_day == self.current_day {
                self.spent_today = self.spent_today.saturating_sub(rec.amount.0);
            }
            emit(
                "payment_failed",
                json!({
                    "record_id": record_id, "receiver_id": rec.receiver_id, "amount": rec.amount,
                    "budget_refunded": rec.budget_day == self.current_day,
                }),
            );
        }
        self.payment_records.replace(record_id as u32, rec);
        ok
    }

    // ------------------------------------------------------------------ views

    pub fn get_wallet_status(&self) -> WalletStatus {
        let today = day_of(env::block_timestamp());
        let spent = if today == self.current_day {
            self.spent_today
        } else {
            0
        };
        WalletStatus {
            owner_id: self.owner_id.clone(),
            agent_id: self.agent_id.clone(),
            frozen: self.frozen,
            daily_limit: U128(self.daily_limit),
            approval_threshold: U128(self.approval_threshold),
            spent_today: U128(spent),
            reserved: U128(self.reserved),
            remaining_today: U128(self.daily_limit.saturating_sub(spent + self.reserved)),
            current_day: today,
            balance: U128(env::account_balance().as_yoctonear()),
            available_balance: U128(self.available_balance()),
            approved_payees: self.approved_payees.iter().cloned().collect(),
            pending_count: self.pending.len(),
            payment_count: self.payment_records.len(),
            blocked_count: self.blocked_total,
        }
    }

    /// Payment records, newest first. `from_index` counts from the newest.
    pub fn get_payment_history(
        &self,
        from_index: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<PaymentRecord> {
        let len = self.payment_records.len();
        let from = from_index.unwrap_or(0).min(len);
        let limit = limit.unwrap_or(50).min(100);
        (0..len - from)
            .rev()
            .take(limit as usize)
            .filter_map(|i| self.payment_records.get(i).cloned())
            .collect()
    }

    /// Blocked attempts, newest first (last MAX_STORED_BLOCKED kept).
    pub fn get_blocked_attempts(
        &self,
        from_index: Option<u32>,
        limit: Option<u32>,
    ) -> Vec<BlockedAttempt> {
        let stored = self.blocked_attempts.len();
        let mut all: Vec<BlockedAttempt> = (0..stored)
            .filter_map(|i| self.blocked_attempts.get(i).cloned())
            .collect();
        all.sort_by(|a, b| b.seq.cmp(&a.seq));
        let from = from_index.unwrap_or(0) as usize;
        let limit = limit.unwrap_or(50).min(100) as usize;
        all.into_iter().skip(from).take(limit).collect()
    }

    pub fn get_pending(&self) -> Vec<PaymentRecord> {
        self.pending
            .iter()
            .filter_map(|id| self.payment_records.get(*id as u32).cloned())
            .collect()
    }

    pub fn get_payment(&self, record_id: u64) -> Option<PaymentRecord> {
        self.payment_records.get(record_id as u32).cloned()
    }

    pub fn is_request_id_used(&self, request_id: String) -> bool {
        self.used_request_ids.contains(&request_id)
    }

    // ------------------------------------------------------------------ internal

    fn assert_owner(&self) {
        require!(
            env::predecessor_account_id() == self.owner_id,
            "Unauthorized: owner only"
        );
        // Requiring 1 yoctoNEAR means only a full-access key (wallet confirmation)
        // can change policy; a leaked function-call key cannot.
        require!(
            env::attached_deposit() == NearToken::from_yoctonear(1),
            "Requires attached deposit of exactly 1 yoctoNEAR"
        );
    }

    fn roll_day(&mut self) {
        let today = day_of(env::block_timestamp());
        if today != self.current_day {
            self.current_day = today;
            self.spent_today = 0;
        }
    }

    fn available_balance(&self) -> u128 {
        let storage = env::storage_byte_cost().as_yoctonear() * env::storage_usage() as u128;
        env::account_balance()
            .as_yoctonear()
            .saturating_sub(storage)
            .saturating_sub(SAFETY_RESERVE.as_yoctonear())
    }

    fn transfer(&self, record_id: u64, to: AccountId, amount: u128) {
        Promise::new(to)
            .transfer(NearToken::from_yoctonear(amount))
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_FOR_CALLBACK)
                    .on_transfer_complete(record_id),
            )
            .detach();
    }

    fn block(
        &mut self,
        request_id: String,
        receiver_id: AccountId,
        amount: U128,
        memo: String,
        status: RequestStatus,
        reason: String,
    ) -> RequestOutcome {
        let seq = self.blocked_total;
        self.blocked_total += 1;
        let attempt = BlockedAttempt {
            seq,
            request_id: request_id.clone(),
            caller: env::predecessor_account_id(),
            receiver_id: receiver_id.clone(),
            amount,
            memo: memo.clone(),
            status: status.clone(),
            reason: reason.clone(),
            timestamp: env::block_timestamp(),
        };
        if self.blocked_attempts.len() < MAX_STORED_BLOCKED {
            self.blocked_attempts.push(attempt);
        } else {
            self.blocked_attempts
                .replace((seq % MAX_STORED_BLOCKED as u64) as u32, attempt);
        }
        emit(
            "payment_blocked",
            json!({
                "seq": seq, "request_id": request_id, "receiver_id": receiver_id, "amount": amount,
                "memo": memo, "status": status, "reason": reason,
            }),
        );
        RequestOutcome {
            status,
            request_id,
            record_id: None,
            reason,
        }
    }
}

#[cfg(test)]
mod tests;
