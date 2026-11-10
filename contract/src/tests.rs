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

const T0: u64 = 1_700_000_000_000_000_000; // arbitrary ns timestamp

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
    // reject releases reservation
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
    // callback success
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
