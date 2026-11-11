use super::*;
use near_sdk::test_utils::{get_logs, VMContextBuilder};
use near_sdk::{testing_env, PromiseResult};

const NEAR: u128 = 1_000_000_000_000_000_000_000_000;
const HASH: &str = "3Rh6iyiZbmi3gQjsWZMGyB7YmNovekeegaQaHBiskmaA";

fn factory_id() -> AccountId {
    "factory.testnet".parse().unwrap()
}
fn admin() -> AccountId {
    "admin.testnet".parse().unwrap()
}
fn alice() -> AccountId {
    "alice.testnet".parse().unwrap()
}
fn vendor() -> AccountId {
    "api-vendor.testnet".parse().unwrap()
}
fn key() -> PublicKey {
    "ed25519:HKUFAQxs88g2ENFMyVjqQXrj2gDWTKQWz4ApoJLEX8YX"
        .parse()
        .unwrap()
}
fn vault(name: &str) -> AccountId {
    format!("{name}.factory.testnet").parse().unwrap()
}

fn ctx(caller: AccountId, deposit: u128) -> VMContextBuilder {
    let mut b = VMContextBuilder::new();
    b.current_account_id(factory_id())
        .predecessor_account_id(caller.clone())
        .signer_account_id(caller)
        .account_balance(NearToken::from_near(10))
        .attached_deposit(NearToken::from_yoctonear(deposit))
        .block_timestamp(1_700_000_000_000_000_000);
    b
}

fn as_caller(caller: AccountId, deposit: u128) {
    testing_env!(ctx(caller, deposit).build());
}

fn callback(result: PromiseResult) {
    testing_env!(
        ctx(factory_id(), 0).build(),
        near_sdk::test_vm_config(),
        near_sdk::RuntimeFeesConfig::test(),
        Default::default(),
        vec![result]
    );
}

fn shopping() -> Template {
    Template {
        id: "shopping".into(),
        name: "Shopping assistant".into(),
        description: "5 NEAR a day, asks you over 1".into(),
        daily_limit: U128(5 * NEAR),
        approval_threshold: U128(NEAR),
        approved_payees: vec![vendor()],
    }
}

fn setup() -> GuardianFactory {
    as_caller(admin(), 0);
    GuardianFactory::new(admin(), HASH.parse().unwrap(), key(), vec![shopping()])
}

fn create(f: &mut GuardianFactory, name: &str) {
    as_caller(alice(), 3 * NEAR);
    let _ = f.create_vault(name.into(), "shopping".into(), None, None, None, None);
}

#[test]
fn starts_with_its_templates_and_config() {
    let f = setup();
    assert_eq!(f.get_templates(), vec![shopping()]);
    let c = f.get_config();
    assert_eq!(c.owner_id, admin());
    assert_eq!(String::from(&c.vault_code_hash), HASH);
    assert_eq!(c.min_deposit.0, MIN_DEPOSIT.as_yoctonear());
    assert_eq!(c.vault_count, 0);
}

#[test]
fn create_vault_claims_the_name_for_the_caller() {
    let mut f = setup();
    create(&mut f, "alice-shop");
    let info = f.get_vault(vault("alice-shop")).unwrap();
    assert_eq!(info.owner_id, alice());
    assert_eq!(
        info.agent_id,
        "alice-shop-agent.factory.testnet"
            .parse::<AccountId>()
            .unwrap()
    );
    assert_eq!(info.state, VaultState::Creating);
    assert!(!f.is_name_available("alice-shop".into()));
    assert!(f.is_name_available("bob".into()));
}

#[test]
#[should_panic(expected = "attach at least")]
fn too_small_a_deposit_is_refused() {
    let mut f = setup();
    as_caller(alice(), MIN_DEPOSIT.as_yoctonear() - 1);
    let _ = f.create_vault("alice".into(), "shopping".into(), None, None, None, None);
}

#[test]
#[should_panic(expected = "unknown template")]
fn unknown_template_is_refused() {
    let mut f = setup();
    as_caller(alice(), NEAR);
    let _ = f.create_vault("alice".into(), "nope".into(), None, None, None, None);
}

#[test]
#[should_panic(expected = "that name is taken")]
fn a_taken_name_is_refused() {
    let mut f = setup();
    create(&mut f, "alice");
    create(&mut f, "alice");
}

#[test]
#[should_panic(expected = "can't be above the daily limit")]
fn threshold_above_limit_is_refused() {
    let mut f = setup();
    as_caller(alice(), NEAR);
    let _ = f.create_vault(
        "alice".into(),
        "shopping".into(),
        Some(U128(NEAR)),
        Some(U128(2 * NEAR)),
        None,
        None,
    );
}

#[test]
#[should_panic(expected = "can't be payees")]
fn the_owner_cannot_be_a_payee() {
    let mut f = setup();
    as_caller(alice(), NEAR);
    let _ = f.create_vault(
        "alice".into(),
        "shopping".into(),
        None,
        None,
        Some(vec![alice()]),
        None,
    );
}

#[test]
fn names_follow_account_rules_and_keep_agent_reserved() {
    for good in ["ab", "alice-shop", "a_1", "x2"] {
        assert_eq!(valid_name(good), None, "{good}");
    }
    for bad in [
        "a",
        "Alice",
        "-a",
        "a-",
        "a--b",
        "a.b",
        "shop-agent",
        &"x".repeat(33),
    ] {
        assert!(valid_name(bad).is_some(), "{bad}");
    }
}

#[test]
#[should_panic(expected = "bad name")]
fn create_vault_checks_the_name() {
    let mut f = setup();
    as_caller(alice(), NEAR);
    let _ = f.create_vault("my.vault".into(), "shopping".into(), None, None, None, None);
}

#[test]
fn a_failed_wallet_frees_the_name_and_refunds() {
    let mut f = setup();
    create(&mut f, "alice");
    callback(PromiseResult::Failed);
    assert!(f
        .on_vault_created(vault("alice"), alice(), U128(3 * NEAR), key())
        .is_none());
    assert!(f.get_vault(vault("alice")).is_none());
    assert!(f.get_vaults_by_owner(alice()).is_empty());
    assert!(get_logs().iter().any(|l| l.contains("vault_failed")));
}

#[test]
fn a_created_wallet_gets_its_agent_then_is_ready() {
    let mut f = setup();
    create(&mut f, "alice");
    callback(PromiseResult::Successful(vec![]));
    assert!(f
        .on_vault_created(vault("alice"), alice(), U128(3 * NEAR), key())
        .is_some());
    assert_eq!(f.get_vaults_by_owner(alice()).len(), 1);
    callback(PromiseResult::Successful(vec![]));
    assert!(f.on_agent_created(vault("alice"), alice()));
    assert_eq!(
        f.get_vault(vault("alice")).unwrap().state,
        VaultState::Ready
    );
    assert!(get_logs().iter().any(|l| l.contains("vault_created")));
}

#[test]
fn a_failed_agent_leaves_a_usable_wallet() {
    let mut f = setup();
    create(&mut f, "alice");
    callback(PromiseResult::Successful(vec![]));
    let _ = f.on_vault_created(vault("alice"), alice(), U128(3 * NEAR), key());
    callback(PromiseResult::Failed);
    assert!(!f.on_agent_created(vault("alice"), alice()));
    assert_eq!(
        f.get_vault(vault("alice")).unwrap().state,
        VaultState::NoAgent
    );
}

#[test]
fn owner_manages_templates_and_code() {
    let mut f = setup();
    as_caller(admin(), 1);
    let api = Template {
        id: "api".into(),
        name: "API buyer".into(),
        ..shopping()
    };
    f.set_template(api.clone());
    assert_eq!(f.get_templates().len(), 2);
    f.remove_template("shopping".into());
    assert_eq!(f.get_templates(), vec![api]);
    f.set_vault_code_hash("11111111111111111111111111111111".parse().unwrap());
    assert_ne!(String::from(&f.get_config().vault_code_hash), HASH);
}

#[test]
#[should_panic(expected = "owner only")]
fn others_cannot_change_templates() {
    let mut f = setup();
    as_caller(alice(), 1);
    f.set_template(shopping());
}

#[test]
#[should_panic(expected = "exactly 1 yoctoNEAR")]
fn owner_changes_need_one_yocto() {
    let mut f = setup();
    as_caller(admin(), 0);
    f.set_hosted_agent_key(key());
}
