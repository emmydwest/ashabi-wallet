//! Guardian Wallet: the agent can only request payments; this contract holds the
//! funds and decides. Policy violations return a status instead of panicking,
//! because a panic would roll back the record of the blocked attempt.

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
/// Caps the storage a compromised agent can burn by spamming bad requests.
pub const MAX_STORED_BLOCKED: u32 = 500;
/// Kept back on top of storage staking.
pub const SAFETY_RESERVE: NearToken = NearToken::from_millinear(100);
const GAS_FOR_CALLBACK: Gas = Gas::from_tgas(10);
const NANOS_PER_MINUTE: u64 = 60 * 1_000_000_000;
/// Defaults for wallets created before the guards existed, and for `new`.
pub const DEFAULT_MAX_AUTO_PAYMENTS: u32 = 3;
pub const DEFAULT_VELOCITY_WINDOW_MINUTES: u32 = 10;
pub const DEFAULT_BREAKER_STRIKES: u32 = 3;
pub const DEFAULT_BREAKER_COOLDOWN_MINUTES: u32 = 10;
pub const DEFAULT_MAX_PENDING: u32 = 3;
pub const DEFAULT_PENDING_TTL_MINUTES: u32 = 24 * 60;
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

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum RequestStatus {
    Approved,
    PendingApproval,
    BlockedRecipient,
    BlockedBudget,
    BlockedVelocity,
    InsufficientFunds,
    Frozen,
    Duplicate,
    /// Too many requests already wait for the owner. New variants go last: blocked attempts
    /// are stored with Borsh, which encodes the variant index.
    TooManyPending,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PaymentStatus {
    PendingApproval,
    Transferring,
    Completed,
    Failed,
    Rejected,
    /// The owner did not decide in time; the reserved budget was released.
    Expired,
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
    /// UTC day index whose budget this payment is charged to.
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
    pub guards: Guards,
    /// Automatic payments inside the current velocity window, and their total.
    pub auto_payments_in_window: u32,
    pub auto_paid_in_window: U128,
    /// Suspicious blocks in a row; the breaker trips at `guards.breaker_strikes`.
    pub strikes: u32,
    /// Block timestamp (ns) the breaker cools down at, if it has tripped.
    pub breaker_until: Option<u64>,
    pub pending_rules: PendingRules,
}

/// Limits that catch patterns a single request cannot show. Zero turns a guard off.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct Guards {
    /// Most automatic (below-threshold) payments allowed per window. Stops threshold splitting.
    pub max_auto_payments: u32,
    pub velocity_window_minutes: u32,
    /// Suspicious blocks in a row that trip the circuit breaker.
    pub breaker_strikes: u32,
    /// How long a tripped breaker refuses requests, unless the owner unfreezes sooner.
    pub breaker_cooldown_minutes: u32,
}

impl Default for Guards {
    fn default() -> Self {
        Self {
            max_auto_payments: DEFAULT_MAX_AUTO_PAYMENTS,
            velocity_window_minutes: DEFAULT_VELOCITY_WINDOW_MINUTES,
            breaker_strikes: DEFAULT_BREAKER_STRIKES,
            breaker_cooldown_minutes: DEFAULT_BREAKER_COOLDOWN_MINUTES,
        }
    }
}

/// Limits on requests waiting for the owner, so a hijacked agent can't tie up the budget
/// with requests nobody approves. Zero turns either off.
#[near(serializers = [json, borsh])]
#[derive(Clone, Debug)]
pub struct PendingRules {
    /// Most requests that may wait for the owner at once.
    pub max_pending: u32,
    /// A waiting request expires after this long and its reserved budget is released.
    pub pending_ttl_minutes: u32,
}

impl Default for PendingRules {
    fn default() -> Self {
        Self {
            max_pending: DEFAULT_MAX_PENDING,
            pending_ttl_minutes: DEFAULT_PENDING_TTL_MINUTES,
        }
    }
}

/// The previous state layout, kept so `migrate` can read it. It had no pending rules.
#[near(serializers = [borsh])]
pub struct GuardianWalletV3 {
    owner_id: AccountId,
    agent_id: AccountId,
    daily_limit: u128,
    approval_threshold: u128,
    spent_today: u128,
    current_day: u64,
    reserved: u128,
    frozen: bool,
    approved_payees: IterableSet<AccountId>,
    payment_records: Vector<PaymentRecord>,
    pending: IterableSet<u64>,
    blocked_attempts: Vector<BlockedAttempt>,
    blocked_total: u64,
    used_request_ids: LookupSet<String>,
    guards: Guards,
    strikes: u32,
    breaker_until: Option<u64>,
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
    /// Pending-approval amounts, counted against the budget.
    reserved: u128,
    frozen: bool,
    approved_payees: IterableSet<AccountId>,
    payment_records: Vector<PaymentRecord>,
    pending: IterableSet<u64>,
    blocked_attempts: Vector<BlockedAttempt>,
    blocked_total: u64,
    used_request_ids: LookupSet<String>,
    guards: Guards,
    strikes: u32,
    breaker_until: Option<u64>,
    pending_rules: PendingRules,
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
            guards: Guards::default(),
            strikes: 0,
            breaker_until: None,
            pending_rules: PendingRules::default(),
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

    /// One-off upgrade from the V3 layout; keeps every record, the guards and the current owner,
    /// and starts the pending rules at their defaults.
    #[private]
    #[init(ignore_state)]
    pub fn migrate() -> Self {
        let old: GuardianWalletV3 = env::state_read().expect("no state to migrate");
        Self {
            owner_id: old.owner_id,
            agent_id: old.agent_id,
            daily_limit: old.daily_limit,
            approval_threshold: old.approval_threshold,
            spent_today: old.spent_today,
            current_day: old.current_day,
            reserved: old.reserved,
            frozen: old.frozen,
            approved_payees: old.approved_payees,
            payment_records: old.payment_records,
            pending: old.pending,
            blocked_attempts: old.blocked_attempts,
            blocked_total: old.blocked_total,
            used_request_ids: old.used_request_ids,
            guards: old.guards,
            strikes: old.strikes,
            breaker_until: old.breaker_until,
            pending_rules: PendingRules::default(),
        }
    }

    #[payable]
    pub fn deposit(&mut self) {
        emit(
            "deposit",
            json!({ "from": env::predecessor_account_id(), "amount": U128(env::attached_deposit().as_yoctonear()) }),
        );
    }

    /// Panics only for a wrong caller or malformed arguments.
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
        self.expire_stale(env::block_timestamp());

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
        let now = env::block_timestamp();
        if let Some(until) = self.breaker_until.filter(|until| now < *until) {
            let minutes = (until - now).div_ceil(NANOS_PER_MINUTE);
            return self.block(
                request_id,
                receiver_id,
                amount,
                memo,
                RequestStatus::Frozen,
                format!(
                    "circuit breaker tripped after repeated suspicious requests; resumes in {} min or when the owner unfreezes",
                    minutes
                ),
            );
        }
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
        let needs_approval = amount.0 > self.approval_threshold;
        let max_pending = self.pending_rules.max_pending;
        if needs_approval && max_pending > 0 && self.pending.len() >= max_pending {
            return self.block(
                request_id,
                receiver_id,
                amount,
                memo,
                RequestStatus::TooManyPending,
                format!(
                    "{} requests already wait for the owner; approve or reject one first",
                    self.pending.len()
                ),
            );
        }
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

        if let Some(reason) = self.velocity_problem(now, amount.0, needs_approval) {
            return self.block(
                request_id,
                receiver_id,
                amount,
                memo,
                RequestStatus::BlockedVelocity,
                reason,
            );
        }

        self.strikes = 0;
        let id = self.payment_records.len() as u64;
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

    /// The budget was already reserved when the agent made the request.
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
            !self.is_stale(&rec, env::block_timestamp()),
            "this request has expired; the agent has to ask again"
        );
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
        self.strikes = 0;
        if self.breaker_until.take().is_some() {
            emit(
                "breaker_reset",
                json!({ "by": env::predecessor_account_id() }),
            );
        }
        emit(
            "wallet_unfrozen",
            json!({ "by": env::predecessor_account_id() }),
        );
    }

    #[payable]
    pub fn set_guards(&mut self, guards: Guards) {
        self.assert_owner();
        require!(
            guards.max_auto_payments == 0 || guards.velocity_window_minutes > 0,
            "velocity window must be at least 1 minute"
        );
        require!(
            guards.breaker_strikes == 0 || guards.breaker_cooldown_minutes > 0,
            "breaker cooldown must be at least 1 minute"
        );
        emit("guards_updated", json!({ "guards": guards }));
        self.guards = guards;
    }

    #[payable]
    pub fn set_pending_rules(&mut self, rules: PendingRules) {
        self.assert_owner();
        emit("pending_rules_updated", json!({ "rules": rules }));
        self.pending_rules = rules;
    }

    /// Releases the budget held by expired requests. Anyone may call it; requests also do it.
    pub fn expire_pending(&mut self) -> u32 {
        self.expire_stale(env::block_timestamp())
    }

    #[payable]
    pub fn set_agent(&mut self, agent_id: AccountId) {
        self.assert_owner();
        require!(agent_id != self.owner_id, "owner and agent must differ");
        self.agent_id = agent_id.clone();
        emit("agent_changed", json!({ "agent_id": agent_id }));
    }

    #[payable]
    pub fn set_owner(&mut self, new_owner: AccountId) {
        self.assert_owner();
        require!(new_owner != self.agent_id, "owner and agent must differ");
        let previous = std::mem::replace(&mut self.owner_id, new_owner.clone());
        emit(
            "owner_changed",
            json!({ "previous_owner": previous, "new_owner": new_owner }),
        );
    }

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

    pub fn get_wallet_status(&self) -> WalletStatus {
        let now = env::block_timestamp();
        let today = day_of(now);
        let spent = if today == self.current_day {
            self.spent_today
        } else {
            0
        };
        let stale = self.stale_pending(now);
        let held: u128 = stale.iter().map(|r| r.amount.0).sum();
        let reserved = self.reserved.saturating_sub(held);
        WalletStatus {
            owner_id: self.owner_id.clone(),
            agent_id: self.agent_id.clone(),
            frozen: self.frozen,
            daily_limit: U128(self.daily_limit),
            approval_threshold: U128(self.approval_threshold),
            spent_today: U128(spent),
            reserved: U128(reserved),
            remaining_today: U128(self.daily_limit.saturating_sub(spent + reserved)),
            current_day: today,
            balance: U128(env::account_balance().as_yoctonear()),
            available_balance: U128(self.available_balance()),
            approved_payees: self.approved_payees.iter().cloned().collect(),
            pending_count: self.pending.len() - stale.len() as u32,
            payment_count: self.payment_records.len(),
            blocked_count: self.blocked_total,
            guards: self.guards.clone(),
            auto_payments_in_window: self.auto_paid_in_window(now).0,
            auto_paid_in_window: U128(self.auto_paid_in_window(now).1),
            strikes: self.strikes,
            breaker_until: self.breaker_until.filter(|until| now < *until),
            pending_rules: self.pending_rules.clone(),
        }
    }

    /// Newest first; `from_index` counts from the newest.
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

    /// Newest first; only the last MAX_STORED_BLOCKED are kept.
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

    /// Requests the owner can still decide on; expired ones are left out.
    pub fn get_pending(&self) -> Vec<PaymentRecord> {
        let now = env::block_timestamp();
        self.pending
            .iter()
            .filter_map(|id| self.payment_records.get(*id as u32).cloned())
            .filter(|rec| !self.is_stale(rec, now))
            .collect()
    }

    /// Shows a request past its deadline as expired even before a call has released it.
    pub fn get_payment(&self, record_id: u64) -> Option<PaymentRecord> {
        let mut rec = self.payment_records.get(record_id as u32).cloned()?;
        if self.pending.contains(&record_id) && self.is_stale(&rec, env::block_timestamp()) {
            rec.status = PaymentStatus::Expired;
        }
        Some(rec)
    }

    pub fn is_request_id_used(&self, request_id: String) -> bool {
        self.used_request_ids.contains(&request_id)
    }

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

    fn is_stale(&self, rec: &PaymentRecord, now: u64) -> bool {
        let ttl = self.pending_rules.pending_ttl_minutes as u64 * NANOS_PER_MINUTE;
        ttl > 0 && now >= rec.created_at + ttl
    }

    fn stale_pending(&self, now: u64) -> Vec<PaymentRecord> {
        self.pending
            .iter()
            .filter_map(|id| self.payment_records.get(*id as u32))
            .filter(|rec| self.is_stale(rec, now))
            .cloned()
            .collect()
    }

    /// The pending set is capped by `max_pending`, so this stays cheap.
    fn expire_stale(&mut self, now: u64) -> u32 {
        let stale = self.stale_pending(now);
        for mut rec in stale.iter().cloned() {
            self.pending.remove(&rec.id);
            self.reserved = self.reserved.saturating_sub(rec.amount.0);
            rec.status = PaymentStatus::Expired;
            rec.updated_at = now;
            emit(
                "payment_expired",
                json!({ "record_id": rec.id, "receiver_id": rec.receiver_id, "amount": rec.amount }),
            );
            self.payment_records.replace(rec.id as u32, rec);
        }
        stale.len() as u32
    }

    fn roll_day(&mut self) {
        let today = day_of(env::block_timestamp());
        if today != self.current_day {
            self.current_day = today;
            self.spent_today = 0;
        }
    }

    /// Count and total of automatic payments made inside the velocity window. Owner-approved,
    /// pending, rejected and failed payments are left out. Records are in time order, so the
    /// scan stops at the first one older than the window.
    fn auto_paid_in_window(&self, now: u64) -> (u32, u128) {
        let start =
            now.saturating_sub(self.guards.velocity_window_minutes as u64 * NANOS_PER_MINUTE);
        let (mut count, mut total) = (0u32, 0u128);
        for i in (0..self.payment_records.len()).rev() {
            let Some(rec) = self.payment_records.get(i) else {
                break;
            };
            if rec.created_at <= start {
                break;
            }
            let automatic = !rec.approved_by_owner
                && matches!(
                    rec.status,
                    PaymentStatus::Transferring | PaymentStatus::Completed
                );
            if automatic {
                count += 1;
                total += rec.amount.0;
            }
        }
        (count, total)
    }

    /// Automatic payments in one window may not add up past the approval threshold, so a large
    /// payment split into small ones still reaches the owner. The count cap stops a flood of dust.
    fn velocity_problem(&self, now: u64, amount: u128, needs_approval: bool) -> Option<String> {
        if needs_approval || self.guards.max_auto_payments == 0 {
            return None;
        }
        let (count, total) = self.auto_paid_in_window(now);
        let window = self.guards.velocity_window_minutes;
        if total + amount > self.approval_threshold {
            return Some(format!(
                "automatic payments in the last {} min would total {} yocto, above the {} yocto auto-pay limit; ask the owner",
                window,
                total + amount,
                self.approval_threshold
            ));
        }
        if count >= self.guards.max_auto_payments {
            return Some(format!(
                "too many automatic payments: at most {} per {} min",
                self.guards.max_auto_payments, window
            ));
        }
        None
    }

    /// Paying a stranger looks like a hijacked agent. Budget, balance and velocity blocks also
    /// happen to honest agents, so they don't count towards the breaker.
    fn record_strike(&mut self, status: &RequestStatus) {
        if *status != RequestStatus::BlockedRecipient {
            return;
        }
        self.strikes += 1;
        if self.guards.breaker_strikes > 0 && self.strikes >= self.guards.breaker_strikes {
            let until = env::block_timestamp()
                + self.guards.breaker_cooldown_minutes as u64 * NANOS_PER_MINUTE;
            self.breaker_until = Some(until);
            self.strikes = 0;
            emit(
                "breaker_tripped",
                json!({ "strikes": self.guards.breaker_strikes, "until": until }),
            );
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
        self.record_strike(&status);
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
