use super::*;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{testing_env, PromiseResult};

const NEAR: u128 = 1_000_000_000_000_000_000_000_000;

fn owner() -> AccountId {
    "owner.testnet".parse().unwrap()
}
fn agent() -> AccountId {
    "agent.testnet".parse().unwrap()
}
fn vendor() -> AccountId {
    "api-vendor.testnet".parse().unwrap()
}
fn attacker() -> AccountId {
    "attacker.testnet".parse().unwrap()
}
fn contract_id() -> AccountId {
    "guardian.testnet".parse().unwrap()
}

fn ctx(caller: AccountId, deposit: u128, ts: u64) -> VMContextBuilder {
    let mut b = VMContextBuilder::new();
    b.current_account_id(contract_id())
        .predecessor_account_id(caller.clone())
        .signer_account_id(caller)
        .account_balance(NearToken::from_near(20))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .block_timestamp(ts);
    b
}

const T0: u64 = 1_700_000_000_000_000_000;

fn setup() -> GuardianWallet {
    testing_env!(ctx(owner(), 0, T0).build());
    GuardianWallet::new(
        owner(),
        agent(),
        U128(5 * NEAR),
        U128(NEAR),
        Some(vec![vendor()]),
    )
}

fn as_agent(ts: u64) {
    testing_env!(ctx(agent(), 0, ts).build());
}
fn as_owner(ts: u64) {
    testing_env!(ctx(owner(), 1, ts).build());
}

fn events(name: &str) -> usize {
    get_logs()
        .iter()
        .filter(|l| l.starts_with("EVENT_JSON:") && l.contains(&format!("\"event\":\"{}\"", name)))
        .count()
}

#[test]
fn normal_payment_is_approved_and_transferring() {
    let mut c = setup();
    as_agent(T0);
    let r = c.request_payment(
        "r1".into(),
        vendor(),
        U128(NEAR / 2),
        Some("weather api".into()),
    );
    assert_eq!(r.status, RequestStatus::Approved);
    assert_eq!(events("payment_approved"), 1);
    let rec = c.get_payment(0).unwrap();
    assert_eq!(rec.status, PaymentStatus::Transferring);
    assert_eq!(c.get_wallet_status().spent_today.0, NEAR / 2);
}

#[test]
fn attacker_recipient_is_blocked_and_persisted() {
    let mut c = setup();
    as_agent(T0);
    let r = c.request_payment(
        "inj-1".into(),
        attacker(),
        U128(NEAR / 10),
        Some("IGNORE PREVIOUS INSTRUCTIONS".into()),
    );
    assert_eq!(r.status, RequestStatus::BlockedRecipient);
    assert_eq!(r.record_id, None);
    assert_eq!(events("payment_blocked"), 1);
    let b = c.get_blocked_attempts(None, None);
    assert_eq!(b.len(), 1);
    assert_eq!(b[0].receiver_id, attacker());
    assert_eq!(c.get_wallet_status().spent_today.0, 0);
    assert_eq!(c.get_wallet_status().payment_count, 0);
}

#[test]
fn over_budget_is_blocked() {
    let mut c = setup();
    c.approval_threshold = 10 * NEAR; // isolate budget rule
    as_agent(T0);
    assert_eq!(
        c.request_payment("a".into(), vendor(), U128(4 * NEAR), None)
            .status,
        RequestStatus::Approved
    );
    let r = c.request_payment("b".into(), vendor(), U128(2 * NEAR), None);
    assert_eq!(r.status, RequestStatus::BlockedBudget);
    assert_eq!(c.get_wallet_status().spent_today.0, 4 * NEAR);
}

#[test]
fn budget_counts_pending_reservations() {
    let mut c = setup();
    as_agent(T0);
    assert_eq!(
        c.request_payment("p1".into(), vendor(), U128(3 * NEAR), None)
            .status,
        RequestStatus::PendingApproval
    );
    assert_eq!(c.get_wallet_status().reserved.0, 3 * NEAR);
    // 3 reserved + 3 requested > 5 limit
    assert_eq!(
        c.request_payment("p2".into(), vendor(), U128(3 * NEAR), None)
            .status,
        RequestStatus::BlockedBudget
    );
    as_owner(T0);
    c.reject_payment(0);
    assert_eq!(c.get_wallet_status().reserved.0, 0);
    assert_eq!(c.get_payment(0).unwrap().status, PaymentStatus::Rejected);
}

#[test]
fn budget_resets_next_day() {
    let mut c = setup();
    c.approval_threshold = 10 * NEAR;
    as_agent(T0);
    assert_eq!(
        c.request_payment("d1".into(), vendor(), U128(5 * NEAR), None)
            .status,
        RequestStatus::Approved
    );
    assert_eq!(
        c.request_payment("d2".into(), vendor(), U128(1), None)
            .status,
        RequestStatus::BlockedBudget
    );
    as_agent(T0 + NANOS_PER_DAY);
    assert_eq!(
        c.request_payment("d3".into(), vendor(), U128(NEAR), None)
            .status,
        RequestStatus::Approved
    );
}

#[test]
fn above_threshold_pending_then_owner_approves_then_completes() {
    let mut c = setup();
    as_agent(T0);
    let r = c.request_payment("big".into(), vendor(), U128(2 * NEAR), None);
    assert_eq!(r.status, RequestStatus::PendingApproval);
    assert_eq!(c.get_pending().len(), 1);
    as_owner(T0 + 1);
    c.approve_payment(0);
    assert_eq!(c.get_pending().len(), 0);
    let s = c.get_wallet_status();
    assert_eq!((s.reserved.0, s.spent_today.0), (0, 2 * NEAR));
    assert!(c.get_payment(0).unwrap().approved_by_owner);
    testing_env!(
        ctx(contract_id(), 0, T0 + 2).build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![PromiseResult::Successful(vec![])]
    );
    assert!(c.on_transfer_complete(0));
    assert_eq!(c.get_payment(0).unwrap().status, PaymentStatus::Completed);
}

#[test]
fn failed_transfer_refunds_budget() {
    let mut c = setup();
    as_agent(T0);
    c.request_payment("f".into(), vendor(), U128(NEAR), None);
    testing_env!(
        ctx(contract_id(), 0, T0 + 2).build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![PromiseResult::Failed]
    );
    assert!(!c.on_transfer_complete(0));
    assert_eq!(c.get_payment(0).unwrap().status, PaymentStatus::Failed);
    assert_eq!(c.get_wallet_status().spent_today.0, 0);
}

#[test]
fn freeze_blocks_everything() {
    let mut c = setup();
    as_owner(T0);
    c.freeze();
    as_agent(T0);
    assert_eq!(
        c.request_payment("z1".into(), vendor(), U128(1), None)
            .status,
        RequestStatus::Frozen
    );
    assert_eq!(
        c.request_payment("z2".into(), attacker(), U128(1), None)
            .status,
        RequestStatus::Frozen
    );
    assert_eq!(c.get_blocked_attempts(None, None).len(), 2);
    as_owner(T0);
    c.unfreeze();
    as_agent(T0);
    assert_eq!(
        c.request_payment("z3".into(), vendor(), U128(1), None)
            .status,
        RequestStatus::Approved
    );
}

#[test]
#[should_panic(expected = "wallet is frozen")]
fn cannot_approve_while_frozen() {
    let mut c = setup();
    as_agent(T0);
    c.request_payment("big".into(), vendor(), U128(2 * NEAR), None);
    as_owner(T0);
    c.freeze();
    c.approve_payment(0);
}

#[test]
fn duplicate_request_id_is_rejected() {
    let mut c = setup();
    as_agent(T0);
    assert_eq!(
        c.request_payment("same".into(), vendor(), U128(NEAR / 10), None)
            .status,
        RequestStatus::Approved
    );
    let r = c.request_payment("same".into(), vendor(), U128(NEAR / 10), None);
    assert_eq!(r.status, RequestStatus::Duplicate);
    assert_eq!(c.get_wallet_status().spent_today.0, NEAR / 10);
    // a blocked request also burns its id
    c.request_payment("x".into(), attacker(), U128(1), None);
    assert_eq!(
        c.request_payment("x".into(), vendor(), U128(1), None)
            .status,
        RequestStatus::Duplicate
    );
}

#[test]
fn insufficient_funds_is_blocked() {
    let mut c = setup();
    c.daily_limit = 100 * NEAR;
    c.approval_threshold = 100 * NEAR;
    as_agent(T0);
    let r = c.request_payment("rich".into(), vendor(), U128(50 * NEAR), None);
    assert_eq!(r.status, RequestStatus::InsufficientFunds);
}

#[test]
#[should_panic(expected = "only the registered agent")]
fn non_agent_cannot_request() {
    let mut c = setup();
    testing_env!(ctx(attacker(), 0, T0).build());
    c.request_payment("h".into(), attacker(), U128(1), None);
}

#[test]
#[should_panic(expected = "owner only")]
fn agent_cannot_add_payee() {
    let mut c = setup();
    testing_env!(ctx(agent(), 1, T0).build());
    c.add_payee(attacker());
}

#[test]
#[should_panic(expected = "1 yoctoNEAR")]
fn owner_methods_need_one_yocto() {
    let mut c = setup();
    testing_env!(ctx(owner(), 0, T0).build());
    c.freeze();
}

#[test]
fn blocked_attempts_ring_buffer_caps_storage() {
    let mut c = setup();
    as_agent(T0);
    for i in 0..(MAX_STORED_BLOCKED + 10) {
        as_agent(T0);
        c.request_payment(format!("spam-{i}"), attacker(), U128(1), None);
    }
    let s = c.get_wallet_status();
    assert_eq!(s.blocked_count, (MAX_STORED_BLOCKED + 10) as u64);
    let newest = c.get_blocked_attempts(None, Some(1));
    assert_eq!(newest[0].seq, (MAX_STORED_BLOCKED + 9) as u64);
}

#[test]
fn owner_admin_methods() {
    let mut c = setup();
    as_owner(T0);
    c.add_payee(attacker());
    c.remove_payee(attacker());
    c.set_daily_limit(U128(9 * NEAR));
    c.set_approval_threshold(U128(2 * NEAR));
    let s = c.get_wallet_status();
    assert_eq!(s.approved_payees, vec![vendor()]);
    assert_eq!(
        (s.daily_limit.0, s.approval_threshold.0),
        (9 * NEAR, 2 * NEAR)
    );
}

#[test]
fn owner_can_hand_over_ownership() {
    let mut c = setup();
    let new_owner: AccountId = "emmy.testnet".parse().unwrap();
    as_owner(T0);
    c.set_owner(new_owner.clone());
    assert_eq!(c.get_wallet_status().owner_id, new_owner);
    assert_eq!(events("owner_changed"), 1);

    testing_env!(ctx(new_owner, 1, T0).build());
    c.freeze();
    assert!(c.get_wallet_status().frozen);
}

#[test]
#[should_panic(expected = "owner only")]
fn previous_owner_loses_access() {
    let mut c = setup();
    as_owner(T0);
    c.set_owner("emmy.testnet".parse().unwrap());
    c.freeze();
}

#[test]
#[should_panic(expected = "owner only")]
fn agent_cannot_take_ownership() {
    let mut c = setup();
    testing_env!(ctx(agent(), 1, T0).build());
    c.set_owner(agent());
}

#[test]
#[should_panic(expected = "owner and agent must differ")]
fn owner_cannot_be_the_agent() {
    let mut c = setup();
    as_owner(T0);
    c.set_owner(agent());
}

#[test]
#[should_panic(expected = "1 yoctoNEAR")]
fn set_owner_needs_one_yocto() {
    let mut c = setup();
    testing_env!(ctx(owner(), 0, T0).build());
    c.set_owner("emmy.testnet".parse().unwrap());
}

const MINUTE: u64 = 60 * 1_000_000_000;

fn pay(c: &mut GuardianWallet, id: &str, to: AccountId, amount: u128) -> RequestStatus {
    c.request_payment(id.into(), to, U128(amount), None).status
}

#[test]
fn splitting_below_threshold_is_capped_by_the_window_total() {
    let mut c = setup();
    as_agent(T0);
    // 1.5 NEAR asked for in 0.3 NEAR pieces: automatic payments stop at the 1 NEAR threshold.
    for i in 0..3 {
        assert_eq!(
            pay(&mut c, &format!("s{i}"), vendor(), 3 * NEAR / 10),
            RequestStatus::Approved
        );
    }
    let r = c.request_payment("s3".into(), vendor(), U128(3 * NEAR / 10), None);
    assert_eq!(r.status, RequestStatus::BlockedVelocity);
    assert!(r
        .reason
        .contains("would total 1200000000000000000000000 yocto"));
    let s = c.get_wallet_status();
    assert_eq!(s.auto_payments_in_window, 3);
    assert_eq!(s.auto_paid_in_window.0, 9 * NEAR / 10);
}

#[test]
fn exactly_the_threshold_in_a_window_is_allowed() {
    let mut c = setup();
    as_agent(T0);
    assert_eq!(
        pay(&mut c, "e0", vendor(), NEAR / 2),
        RequestStatus::Approved
    );
    assert_eq!(
        pay(&mut c, "e1", vendor(), NEAR / 2),
        RequestStatus::Approved
    );
    assert_eq!(
        pay(&mut c, "e2", vendor(), 1),
        RequestStatus::BlockedVelocity
    );
}

#[test]
fn the_count_cap_still_stops_dust() {
    let mut c = setup();
    as_agent(T0);
    for i in 0..3 {
        pay(&mut c, &format!("d{i}"), vendor(), NEAR / 100);
    }
    let r = c.request_payment("d3".into(), vendor(), U128(NEAR / 100), None);
    assert_eq!(r.status, RequestStatus::BlockedVelocity);
    assert!(r.reason.contains("too many automatic payments"));
}

#[test]
fn velocity_window_rolls_forward() {
    let mut c = setup();
    as_agent(T0);
    pay(&mut c, "w0", vendor(), NEAR);
    assert_eq!(
        pay(&mut c, "w1", vendor(), NEAR / 10),
        RequestStatus::BlockedVelocity
    );
    as_agent(T0 + 10 * MINUTE + 1);
    assert_eq!(
        pay(&mut c, "w2", vendor(), NEAR / 10),
        RequestStatus::Approved
    );
}

#[test]
fn owner_approved_and_failed_payments_do_not_use_the_window() {
    let mut c = setup();
    as_agent(T0);
    assert_eq!(
        pay(&mut c, "big", vendor(), 2 * NEAR),
        RequestStatus::PendingApproval
    );
    as_owner(T0);
    c.approve_payment(0);
    as_agent(T0);
    assert_eq!(
        pay(&mut c, "small", vendor(), NEAR / 2),
        RequestStatus::Approved
    );
    testing_env!(
        ctx(contract_id(), 0, T0).build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![PromiseResult::Failed],
    );
    c.on_transfer_complete(1);
    as_agent(T0);
    assert_eq!(
        pay(&mut c, "again", vendor(), NEAR),
        RequestStatus::Approved
    );
}

#[test]
fn above_threshold_payments_skip_the_velocity_limit() {
    let mut c = setup();
    as_agent(T0);
    pay(&mut c, "v0", vendor(), NEAR);
    // Large payments already wait for the owner, so they are not counted or limited.
    assert_eq!(
        pay(&mut c, "big", vendor(), 2 * NEAR),
        RequestStatus::PendingApproval
    );
}

#[test]
fn velocity_blocks_do_not_count_as_strikes() {
    let mut c = setup();
    as_agent(T0);
    pay(&mut c, "v0", vendor(), NEAR);
    for i in 0..4 {
        assert_eq!(
            pay(&mut c, &format!("v{}", i + 1), vendor(), NEAR / 10),
            RequestStatus::BlockedVelocity
        );
    }
    assert_eq!(c.get_wallet_status().strikes, 0);
}

#[test]
fn breaker_trips_after_three_suspicious_blocks_then_cools_down() {
    let mut c = setup();
    as_agent(T0);
    for i in 0..3 {
        assert_eq!(
            pay(&mut c, &format!("a{i}"), attacker(), NEAR),
            RequestStatus::BlockedRecipient
        );
    }
    assert_eq!(events("breaker_tripped"), 1);
    assert!(c.get_wallet_status().breaker_until.is_some());

    as_agent(T0 + MINUTE);
    assert_eq!(
        pay(&mut c, "ok1", vendor(), NEAR / 10),
        RequestStatus::Frozen
    );

    as_agent(T0 + 10 * MINUTE + 1);
    assert!(c.get_wallet_status().breaker_until.is_none());
    assert_eq!(
        pay(&mut c, "ok2", vendor(), NEAR / 10),
        RequestStatus::Approved
    );
}

#[test]
fn a_good_request_resets_the_strikes() {
    let mut c = setup();
    as_agent(T0);
    pay(&mut c, "a0", attacker(), NEAR);
    pay(&mut c, "a1", attacker(), NEAR);
    pay(&mut c, "ok", vendor(), NEAR / 10);
    pay(&mut c, "a2", attacker(), NEAR);
    assert_eq!(c.get_wallet_status().strikes, 1);
    assert!(c.get_wallet_status().breaker_until.is_none());
}

#[test]
fn budget_blocks_do_not_count_as_strikes() {
    let mut c = setup();
    as_agent(T0);
    for i in 0..4 {
        assert_eq!(
            pay(&mut c, &format!("b{i}"), vendor(), 6 * NEAR),
            RequestStatus::BlockedBudget
        );
    }
    assert_eq!(c.get_wallet_status().strikes, 0);
}

#[test]
fn owner_unfreeze_resets_a_tripped_breaker() {
    let mut c = setup();
    as_agent(T0);
    for i in 0..3 {
        pay(&mut c, &format!("a{i}"), attacker(), NEAR);
    }
    as_owner(T0 + MINUTE);
    c.unfreeze();
    assert_eq!(events("breaker_reset"), 1);
    as_agent(T0 + MINUTE);
    assert_eq!(
        pay(&mut c, "ok", vendor(), NEAR / 10),
        RequestStatus::Approved
    );
}

#[test]
fn owner_can_tune_or_disable_guards() {
    let mut c = setup();
    as_owner(T0);
    c.set_guards(Guards {
        max_auto_payments: 0,
        velocity_window_minutes: 0,
        breaker_strikes: 0,
        breaker_cooldown_minutes: 0,
    });
    assert_eq!(events("guards_updated"), 1);
    as_agent(T0);
    for i in 0..5 {
        assert_eq!(
            pay(&mut c, &format!("n{i}"), vendor(), NEAR / 10),
            RequestStatus::Approved
        );
        assert_eq!(
            pay(&mut c, &format!("x{i}"), attacker(), NEAR),
            RequestStatus::BlockedRecipient
        );
    }
    assert!(c.get_wallet_status().breaker_until.is_none());
}

#[test]
#[should_panic(expected = "Unauthorized: owner only")]
fn agent_cannot_change_guards() {
    let mut c = setup();
    testing_env!(ctx(agent(), 1, T0).build());
    c.set_guards(Guards::default());
}

fn record(id: u64, amount: u128, status: PaymentStatus, at: u64) -> PaymentRecord {
    PaymentRecord {
        id,
        request_id: format!("old-{id}"),
        receiver_id: vendor(),
        amount: U128(amount),
        memo: "sku:weather-basic".into(),
        status,
        created_at: at,
        updated_at: at,
        budget_day: day_of(at),
        approved_by_owner: false,
    }
}

#[test]
fn migrate_keeps_v3_state() {
    testing_env!(ctx(contract_id(), 0, T0).build());
    let mut payees = IterableSet::new(StorageKey::Payees);
    payees.insert(vendor());
    payees.flush();
    let mut records = Vector::new(StorageKey::Records);
    records.push(record(0, NEAR / 2, PaymentStatus::Completed, T0));
    records.push(record(1, 2 * NEAR, PaymentStatus::PendingApproval, T0));
    records.flush();
    let mut pending = IterableSet::new(StorageKey::Pending);
    pending.insert(1);
    pending.flush();
    let mut blocked = Vector::new(StorageKey::Blocked);
    blocked.push(BlockedAttempt {
        seq: 0,
        request_id: "evil".into(),
        caller: agent(),
        receiver_id: attacker(),
        amount: U128(NEAR),
        memo: "injected".into(),
        status: RequestStatus::BlockedRecipient,
        reason: "not approved".into(),
        timestamp: T0,
    });
    blocked.flush();
    let old = GuardianWalletV3 {
        owner_id: owner(),
        agent_id: agent(),
        daily_limit: 5 * NEAR,
        approval_threshold: NEAR,
        spent_today: NEAR / 2,
        current_day: day_of(T0),
        reserved: 2 * NEAR,
        frozen: false,
        approved_payees: payees,
        payment_records: records,
        pending,
        blocked_attempts: blocked,
        blocked_total: 24,
        used_request_ids: LookupSet::new(StorageKey::UsedRequestIds),
        guards: Guards::default(),
        strikes: 2,
        breaker_until: None,
    };
    env::state_write(&old);
    let c = GuardianWallet::migrate(None);
    let s = c.get_wallet_status();
    assert_eq!(s.owner_id, owner());
    assert_eq!(s.blocked_count, 24);
    assert_eq!((s.spent_today.0, s.reserved.0), (NEAR / 2, 2 * NEAR));
    assert_eq!(s.approved_payees, vec![vendor()]);
    assert_eq!(s.strikes, 2);
    assert_eq!(s.pending_rules.max_pending, DEFAULT_MAX_PENDING);
    assert_eq!(
        s.pending_rules.pending_ttl_minutes,
        DEFAULT_PENDING_TTL_MINUTES
    );
    assert_eq!(c.get_payment(0).unwrap().status, PaymentStatus::Completed);
    assert_eq!(c.get_pending().len(), 1);
    assert_eq!(
        c.get_blocked_attempts(None, None)[0].status,
        RequestStatus::BlockedRecipient
    );
}

#[test]
fn migrated_pending_request_still_expires_and_can_be_approved_in_time() {
    testing_env!(ctx(contract_id(), 0, T0).build());
    let mut records = Vector::new(StorageKey::Records);
    records.push(record(0, 2 * NEAR, PaymentStatus::PendingApproval, T0));
    records.flush();
    let mut pending = IterableSet::new(StorageKey::Pending);
    pending.insert(0);
    pending.flush();
    let mut payees = IterableSet::new(StorageKey::Payees);
    payees.insert(vendor());
    payees.flush();
    env::state_write(&GuardianWalletV3 {
        owner_id: owner(),
        agent_id: agent(),
        daily_limit: 5 * NEAR,
        approval_threshold: NEAR,
        spent_today: 0,
        current_day: day_of(T0),
        reserved: 2 * NEAR,
        frozen: false,
        approved_payees: payees,
        payment_records: records,
        pending,
        blocked_attempts: Vector::new(StorageKey::Blocked),
        blocked_total: 0,
        used_request_ids: LookupSet::new(StorageKey::UsedRequestIds),
        guards: Guards::default(),
        strikes: 0,
        breaker_until: None,
    });
    let mut c = GuardianWallet::migrate(None);
    as_owner(T0 + 60 * MINUTE);
    c.approve_payment(0);
    assert_eq!(
        c.get_payment(0).unwrap().status,
        PaymentStatus::Transferring
    );
}

#[test]
fn pending_request_expires_and_releases_budget() {
    let mut c = setup();
    as_agent(T0);
    assert_eq!(
        pay(&mut c, "big", vendor(), 2 * NEAR),
        RequestStatus::PendingApproval
    );
    assert_eq!(c.get_wallet_status().reserved.0, 2 * NEAR);

    let later = T0 + DEFAULT_PENDING_TTL_MINUTES as u64 * MINUTE;
    as_agent(later);
    // The view already treats it as expired before any call releases it.
    let s = c.get_wallet_status();
    assert_eq!((s.reserved.0, s.pending_count), (0, 0));
    assert_eq!(c.get_payment(0).unwrap().status, PaymentStatus::Expired);
    assert!(c.get_pending().is_empty());

    assert_eq!(
        pay(&mut c, "small", vendor(), NEAR / 2),
        RequestStatus::Approved
    );
    assert_eq!(events("payment_expired"), 1);
    assert_eq!(c.get_payment(0).unwrap().status, PaymentStatus::Expired);
    assert_eq!(c.get_wallet_status().reserved.0, 0);
}

#[test]
#[should_panic(expected = "this request has expired")]
fn owner_cannot_approve_an_expired_request() {
    let mut c = setup();
    as_agent(T0);
    pay(&mut c, "big", vendor(), 2 * NEAR);
    as_owner(T0 + DEFAULT_PENDING_TTL_MINUTES as u64 * MINUTE + 1);
    c.approve_payment(0);
}

#[test]
fn anyone_can_release_expired_requests() {
    let mut c = setup();
    as_agent(T0);
    pay(&mut c, "big", vendor(), 2 * NEAR);
    testing_env!(ctx(
        attacker(),
        0,
        T0 + DEFAULT_PENDING_TTL_MINUTES as u64 * MINUTE
    )
    .build());
    assert_eq!(c.expire_pending(), 1);
    assert_eq!(c.expire_pending(), 0);
    assert_eq!(c.get_wallet_status().reserved.0, 0);
}

#[test]
fn too_many_pending_requests_are_refused() {
    let mut c = setup();
    as_agent(T0);
    for i in 0..DEFAULT_MAX_PENDING {
        assert_eq!(
            pay(&mut c, &format!("big-{i}"), vendor(), NEAR + 1),
            RequestStatus::PendingApproval
        );
    }
    let r = c.request_payment("one-more".into(), vendor(), U128(NEAR + 1), None);
    assert_eq!(r.status, RequestStatus::TooManyPending);
    assert!(r.reason.contains("approve or reject"));
    // Not a sign of a stranger being paid, so no strike; small payments still go through.
    assert_eq!(c.get_wallet_status().strikes, 0);
    assert_eq!(
        pay(&mut c, "small", vendor(), NEAR / 2),
        RequestStatus::Approved
    );

    as_owner(T0 + 1);
    c.reject_payment(0);
    as_agent(T0 + 2);
    assert_eq!(
        pay(&mut c, "now-fits", vendor(), NEAR + 1),
        RequestStatus::PendingApproval
    );
}

#[test]
fn owner_can_tune_or_disable_pending_rules() {
    let mut c = setup();
    as_owner(T0);
    c.set_pending_rules(PendingRules {
        max_pending: 0,
        pending_ttl_minutes: 0,
    });
    assert_eq!(events("pending_rules_updated"), 1);
    as_agent(T0);
    for i in 0..5 {
        pay(&mut c, &format!("big-{i}"), vendor(), NEAR + 1);
    }
    assert_eq!(c.get_wallet_status().pending_count, 4); // the fifth hits the daily budget
    as_agent(T0 + 365 * 24 * 60 * MINUTE);
    assert_eq!(c.get_pending().len(), 4);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn agent_cannot_change_pending_rules() {
    let mut c = setup();
    testing_env!(ctx(agent(), 1, T0).build());
    c.set_pending_rules(PendingRules {
        max_pending: 0,
        pending_ttl_minutes: 0,
    });
}

fn reporter() -> AccountId {
    "security-desk.testnet".parse().unwrap()
}

fn report(c: &mut GuardianWallet, by: AccountId, target: AccountId) {
    testing_env!(ctx(by, 1, T0).build());
    c.report_payee(
        target,
        "drained another vault".into(),
        Some("9v7FThK3Kz5qzAidyHdbrrtFsss4wgQUNES1RavZb2ya".into()),
    );
}

#[test]
fn reported_payee_is_blocked_even_when_approved() {
    let mut c = setup();
    report(&mut c, owner(), vendor());
    as_agent(T0 + 1);
    let r = c.request_payment("r1".into(), vendor(), U128(NEAR / 10), None);
    assert_eq!(r.status, RequestStatus::BlockedCounterparty);
    assert!(r.reason.contains("drained another vault"));
    assert_eq!(events("payment_blocked"), 1);
    let s = c.get_wallet_status();
    assert_eq!((s.spent_today.0, s.reported_payees), (0, 1));
    assert_eq!(
        c.get_blocked_attempts(None, None)[0].status,
        RequestStatus::BlockedCounterparty
    );
}

#[test]
fn trusted_reporter_can_report_but_not_clear() {
    let mut c = setup();
    as_owner(T0);
    c.add_reporter(reporter());
    report(&mut c, reporter(), attacker());
    let saved = c.get_payee_report(attacker()).unwrap();
    assert_eq!(saved.reported_by, reporter());
    assert_eq!(
        saved.evidence_tx.as_deref(),
        Some("9v7FThK3Kz5qzAidyHdbrrtFsss4wgQUNES1RavZb2ya")
    );
    assert_eq!(events("payee_reported"), 1);

    testing_env!(ctx(reporter(), 1, T0).build());
    let cleared = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        c.clear_payee_report(attacker())
    }));
    assert!(cleared.is_err());
    assert!(c.get_payee_report(attacker()).is_some());
}

#[test]
#[should_panic(expected = "only the owner or a trusted reporter")]
fn strangers_cannot_report() {
    let mut c = setup();
    report(&mut c, attacker(), vendor());
}

#[test]
#[should_panic(expected = "only the owner or a trusted reporter")]
fn the_agent_cannot_report() {
    let mut c = setup();
    report(&mut c, agent(), vendor());
}

#[test]
#[should_panic(expected = "the agent cannot be a reporter")]
fn the_agent_cannot_be_made_a_reporter() {
    let mut c = setup();
    as_owner(T0);
    c.add_reporter(agent());
}

#[test]
#[should_panic(expected = "exactly 1 yoctoNEAR")]
fn reporting_needs_one_yocto() {
    let mut c = setup();
    testing_env!(ctx(owner(), 0, T0).build());
    c.report_payee(attacker(), "scam".into(), None);
}

#[test]
#[should_panic(expected = "cannot be reported")]
fn the_owner_cannot_be_reported() {
    let mut c = setup();
    as_owner(T0);
    c.add_reporter(reporter());
    report(&mut c, reporter(), owner());
}

#[test]
fn owner_clears_a_report_and_payments_resume() {
    let mut c = setup();
    report(&mut c, owner(), vendor());
    as_owner(T0 + 1);
    c.clear_payee_report(vendor());
    assert_eq!(events("payee_report_cleared"), 1);
    as_agent(T0 + 2);
    assert_eq!(
        pay(&mut c, "r1", vendor(), NEAR / 10),
        RequestStatus::Approved
    );
}

#[test]
fn removed_reporter_loses_access() {
    let mut c = setup();
    as_owner(T0);
    c.add_reporter(reporter());
    c.remove_reporter(reporter());
    assert!(c.get_wallet_status().reporters.is_empty());
    testing_env!(ctx(reporter(), 1, T0).build());
    let reported = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        c.report_payee(vendor(), "grief".into(), None)
    }));
    assert!(reported.is_err());
}

#[test]
fn counterparty_blocks_count_towards_the_breaker() {
    let mut c = setup();
    report(&mut c, owner(), attacker());
    as_agent(T0 + 1);
    for i in 0..3 {
        assert_eq!(
            pay(&mut c, &format!("a{i}"), attacker(), NEAR / 10),
            RequestStatus::BlockedCounterparty
        );
    }
    assert_eq!(events("breaker_tripped"), 1);
    assert_eq!(
        pay(&mut c, "ok", vendor(), NEAR / 10),
        RequestStatus::Frozen
    );
}

#[test]
#[should_panic(expected = "this payee has been reported")]
fn owner_cannot_approve_a_payment_to_a_reported_payee() {
    let mut c = setup();
    as_agent(T0);
    assert_eq!(
        pay(&mut c, "big", vendor(), 2 * NEAR),
        RequestStatus::PendingApproval
    );
    report(&mut c, owner(), vendor());
    as_owner(T0 + 1);
    c.approve_payment(0);
}

#[test]
fn the_blocklist_is_capped() {
    let mut c = setup();
    testing_env!(ctx(owner(), 1, T0).build());
    for i in 0..MAX_REPORTED_PAYEES {
        // A fresh context every few reports keeps the event logs under the per-call limit.
        if i % 40 == 0 {
            testing_env!(ctx(owner(), 1, T0).build());
        }
        c.report_payee(
            format!("scam{i}.testnet").parse().unwrap(),
            "scam".into(),
            None,
        );
    }
    testing_env!(ctx(owner(), 1, T0).build());
    // Updating an entry that is already listed still works when the list is full.
    c.report_payee(
        "scam0.testnet".parse().unwrap(),
        "scam, confirmed".into(),
        None,
    );
    let full = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        c.report_payee("one-more.testnet".parse().unwrap(), "scam".into(), None)
    }));
    assert!(full.is_err());
    assert_eq!(c.get_reported_payees(Some(0), Some(100)).len(), 100);
}

#[test]
fn migrate_keeps_v4_state_and_seeds_reporters() {
    testing_env!(ctx(contract_id(), 0, T0).build());
    let mut payees = IterableSet::new(StorageKey::Payees);
    payees.insert(vendor());
    payees.flush();
    let mut records = Vector::new(StorageKey::Records);
    records.push(record(0, NEAR / 2, PaymentStatus::Completed, T0));
    records.flush();
    env::state_write(&GuardianWalletV4 {
        owner_id: owner(),
        agent_id: agent(),
        daily_limit: 5 * NEAR,
        approval_threshold: NEAR,
        spent_today: NEAR / 2,
        current_day: day_of(T0),
        reserved: 0,
        frozen: false,
        approved_payees: payees,
        payment_records: records,
        pending: IterableSet::new(StorageKey::Pending),
        blocked_attempts: Vector::new(StorageKey::Blocked),
        blocked_total: 78,
        used_request_ids: LookupSet::new(StorageKey::UsedRequestIds),
        guards: Guards {
            breaker_cooldown_minutes: 3,
            ..Guards::default()
        },
        strikes: 2,
        breaker_until: None,
        pending_rules: PendingRules {
            max_pending: 2,
            pending_ttl_minutes: 60,
        },
    });
    let c = GuardianWallet::migrate(Some(vec![reporter()]));
    let s = c.get_wallet_status();
    assert_eq!((s.owner_id, s.blocked_count, s.strikes), (owner(), 78, 2));
    assert_eq!((s.spent_today.0, s.daily_limit.0), (NEAR / 2, 5 * NEAR));
    assert_eq!(s.guards.breaker_cooldown_minutes, 3);
    assert_eq!(s.pending_rules.max_pending, 2);
    assert_eq!((s.reported_payees, s.reporters), (0, vec![reporter()]));
    assert_eq!(c.get_payment(0).unwrap().amount.0, NEAR / 2);
}
