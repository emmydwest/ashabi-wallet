//! Guardian factory: one call creates a guarded wallet for the caller.
//!
//! Each wallet is a sub-account `<name>.<factory>` that runs the Guardian Wallet code as a
//! NEAR global contract (NEP-591), referenced by code hash. The code was published once, so a
//! new wallet stores a 32-byte reference instead of its own 230 KB copy, and the hash pins
//! exactly which code every wallet runs. Wallets get no access keys: nobody, including this
//! factory, can redeploy or drain them. The caller becomes the owner.
//!
//! Next to each wallet the factory creates `<name>-agent.<factory>`, whose only key is a
//! function-call key for `request_payment` on that wallet.

use near_sdk::json_types::{Base58CryptoHash, U128};
use near_sdk::serde_json::json;
use near_sdk::store::{IterableMap, LookupMap};
use near_sdk::{
    env, near, require, AccountId, Allowance, BorshStorageKey, CryptoHash, Gas, NearToken,
    PanicOnDefault, Promise, PublicKey,
};

/// The least a caller can attach: wallet storage and reserve, agent gas, registry storage.
pub const MIN_DEPOSIT: NearToken = NearToken::from_millinear(500);
/// Moved to the agent account; it pays the agent's gas, capped by the key allowance.
pub const AGENT_FUNDING: NearToken = NearToken::from_millinear(250);
/// Kept by the factory to pay for the registry entry.
pub const REGISTRY_FEE: NearToken = NearToken::from_millinear(10);
pub const MAX_NAME_LEN: usize = 32;
pub const AGENT_SUFFIX: &str = "-agent";
pub const MAX_PAYEES: usize = 10;

const GAS_FOR_INIT: Gas = Gas::from_tgas(30);
const GAS_FOR_ON_WALLET: Gas = Gas::from_tgas(60);
const GAS_FOR_ON_AGENT: Gas = Gas::from_tgas(15);
const EVENT_STANDARD: &str = "guardian_factory";
const EVENT_VERSION: &str = "1.0.0";

#[derive(BorshStorageKey)]
#[near]
enum StorageKey {
    Vaults,
    ByOwner,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub description: String,
    pub daily_limit: U128,
    pub approval_threshold: U128,
    pub approved_payees: Vec<AccountId>,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum VaultState {
    Creating,
    Ready,
    /// The wallet exists but its agent account could not be made; the owner can `set_agent`.
    NoAgent,
}

#[near(serializers = [json, borsh])]
#[derive(Clone, Debug, PartialEq)]
pub struct VaultInfo {
    pub vault_id: AccountId,
    pub agent_id: AccountId,
    pub owner_id: AccountId,
    pub template_id: String,
    pub state: VaultState,
    pub created_at: u64,
}

#[near(serializers = [json])]
pub struct FactoryConfig {
    pub owner_id: AccountId,
    pub vault_code_hash: Base58CryptoHash,
    pub hosted_agent_key: PublicKey,
    pub min_deposit: U128,
    pub agent_funding: U128,
    pub vault_count: u32,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct GuardianFactory {
    owner_id: AccountId,
    vault_code_hash: CryptoHash,
    /// Used when the caller doesn't bring a key: the hosted assistant's public key.
    hosted_agent_key: PublicKey,
    templates: Vec<Template>,
    vaults: IterableMap<AccountId, VaultInfo>,
    by_owner: LookupMap<AccountId, Vec<AccountId>>,
}

#[near]
impl GuardianFactory {
    #[init]
    pub fn new(
        owner_id: AccountId,
        vault_code_hash: Base58CryptoHash,
        hosted_agent_key: PublicKey,
        templates: Vec<Template>,
    ) -> Self {
        let mut factory = Self {
            owner_id,
            vault_code_hash: vault_code_hash.into(),
            hosted_agent_key,
            templates: Vec::new(),
            vaults: IterableMap::new(StorageKey::Vaults),
            by_owner: LookupMap::new(StorageKey::ByOwner),
        };
        for t in templates {
            factory.put_template(t);
        }
        factory
    }

    /// Creates `<name>.<factory>` owned by the caller, using a template's limits unless
    /// overridden. Everything attached beyond the fees lands in the new wallet.
    #[payable]
    pub fn create_vault(
        &mut self,
        name: String,
        template_id: String,
        daily_limit: Option<U128>,
        approval_threshold: Option<U128>,
        extra_payees: Option<Vec<AccountId>>,
        agent_key: Option<PublicKey>,
    ) -> Promise {
        let deposit = env::attached_deposit();
        require!(
            deposit >= MIN_DEPOSIT,
            format!("attach at least {MIN_DEPOSIT} to cover storage and the agent's gas")
        );
        check_name(&name);
        let owner_id = env::predecessor_account_id();
        let template = self
            .templates
            .iter()
            .find(|t| t.id == template_id)
            .cloned()
            .unwrap_or_else(|| env::panic_str("unknown template"));

        let daily_limit = daily_limit.unwrap_or(template.daily_limit);
        let approval_threshold = approval_threshold.unwrap_or(template.approval_threshold);
        require!(daily_limit.0 > 0, "daily limit must be above zero");
        require!(
            approval_threshold.0 <= daily_limit.0,
            "approval threshold can't be above the daily limit"
        );
        let mut payees = template.approved_payees.clone();
        for p in extra_payees.unwrap_or_default() {
            if !payees.contains(&p) {
                payees.push(p);
            }
        }
        require!(payees.len() <= MAX_PAYEES, "too many payees");

        let vault_id: AccountId = format!("{name}.{}", env::current_account_id())
            .parse()
            .unwrap();
        let agent_id: AccountId = format!("{name}{AGENT_SUFFIX}.{}", env::current_account_id())
            .parse()
            .unwrap();
        require!(
            !self.vaults.contains_key(&vault_id),
            "that name is taken; pick another"
        );
        require!(
            payees
                .iter()
                .all(|p| *p != owner_id && *p != vault_id && *p != agent_id),
            "the owner, the wallet and its agent can't be payees"
        );

        // Claim the name now so a second call in the same block can't race for it.
        self.vaults.insert(
            vault_id.clone(),
            VaultInfo {
                vault_id: vault_id.clone(),
                agent_id: agent_id.clone(),
                owner_id: owner_id.clone(),
                template_id: template.id.clone(),
                state: VaultState::Creating,
                created_at: env::block_timestamp(),
            },
        );

        let vault_amount = deposit
            .saturating_sub(AGENT_FUNDING)
            .saturating_sub(REGISTRY_FEE);
        let init_args = json!({
            "owner_id": owner_id,
            "agent_id": agent_id,
            "daily_limit": daily_limit,
            "approval_threshold": approval_threshold,
            "approved_payees": payees,
        });

        Promise::new(vault_id.clone())
            .create_account()
            .transfer(vault_amount)
            .use_global_contract(self.vault_code_hash)
            .function_call(
                "new".to_string(),
                init_args.to_string().into_bytes(),
                NearToken::from_yoctonear(0),
                GAS_FOR_INIT,
            )
            .then(
                Self::ext(env::current_account_id())
                    .with_static_gas(GAS_FOR_ON_WALLET)
                    .on_vault_created(
                        vault_id,
                        owner_id,
                        U128(deposit.as_yoctonear()),
                        agent_key.unwrap_or_else(|| self.hosted_agent_key.clone()),
                    ),
            )
    }

    #[private]
    pub fn on_vault_created(
        &mut self,
        vault_id: AccountId,
        owner_id: AccountId,
        deposit: U128,
        agent_key: PublicKey,
    ) -> Option<Promise> {
        if !promise_succeeded() {
            // The whole batch rolled back and its deposit came back here; return all of it.
            self.vaults.remove(&vault_id);
            emit(
                "vault_failed",
                json!({ "vault_id": vault_id, "owner_id": owner_id }),
            );
            Promise::new(owner_id)
                .transfer(NearToken::from_yoctonear(deposit.0))
                .detach();
            return None;
        }
        self.by_owner
            .entry(owner_id.clone())
            .or_default()
            .push(vault_id.clone());
        let agent_id = self
            .vaults
            .get(&vault_id)
            .expect("vault missing")
            .agent_id
            .clone();
        let allowance = Allowance::limited(AGENT_FUNDING).unwrap();
        Some(
            Promise::new(agent_id)
                .create_account()
                .transfer(AGENT_FUNDING)
                .add_access_key_allowance(agent_key, allowance, vault_id.clone(), "request_payment")
                .then(
                    Self::ext(env::current_account_id())
                        .with_static_gas(GAS_FOR_ON_AGENT)
                        .on_agent_created(vault_id, owner_id),
                ),
        )
    }

    #[private]
    pub fn on_agent_created(&mut self, vault_id: AccountId, owner_id: AccountId) -> bool {
        let ok = promise_succeeded();
        let info = self.vaults.get_mut(&vault_id).expect("vault missing");
        info.state = if ok {
            VaultState::Ready
        } else {
            VaultState::NoAgent
        };
        let agent_id = info.agent_id.clone();
        if !ok {
            Promise::new(owner_id.clone())
                .transfer(AGENT_FUNDING)
                .detach();
        }
        emit(
            "vault_created",
            json!({
                "vault_id": vault_id, "agent_id": agent_id, "owner_id": owner_id, "agent_ready": ok,
            }),
        );
        ok
    }

    // ---- owner ----

    /// New wallets use this code; existing wallets keep the code they were created with.
    #[payable]
    pub fn set_vault_code_hash(&mut self, vault_code_hash: Base58CryptoHash) {
        self.assert_owner();
        self.vault_code_hash = vault_code_hash.into();
        emit(
            "code_hash_updated",
            json!({ "vault_code_hash": vault_code_hash }),
        );
    }

    #[payable]
    pub fn set_hosted_agent_key(&mut self, hosted_agent_key: PublicKey) {
        self.assert_owner();
        self.hosted_agent_key = hosted_agent_key;
    }

    #[payable]
    pub fn set_template(&mut self, template: Template) {
        self.assert_owner();
        self.put_template(template);
    }

    #[payable]
    pub fn remove_template(&mut self, template_id: String) {
        self.assert_owner();
        self.templates.retain(|t| t.id != template_id);
    }

    // ---- views ----

    pub fn get_config(&self) -> FactoryConfig {
        FactoryConfig {
            owner_id: self.owner_id.clone(),
            vault_code_hash: self.vault_code_hash.into(),
            hosted_agent_key: self.hosted_agent_key.clone(),
            min_deposit: U128(MIN_DEPOSIT.as_yoctonear()),
            agent_funding: U128(AGENT_FUNDING.as_yoctonear()),
            vault_count: self.vaults.len(),
        }
    }

    pub fn get_templates(&self) -> Vec<Template> {
        self.templates.clone()
    }

    pub fn get_vault(&self, vault_id: AccountId) -> Option<VaultInfo> {
        self.vaults.get(&vault_id).cloned()
    }

    pub fn get_vaults_by_owner(&self, owner_id: AccountId) -> Vec<VaultInfo> {
        self.by_owner
            .get(&owner_id)
            .map(|ids| {
                ids.iter()
                    .filter_map(|id| self.vaults.get(id).cloned())
                    .collect()
            })
            .unwrap_or_default()
    }

    pub fn is_name_available(&self, name: String) -> bool {
        valid_name(&name).is_none()
            && !self.vaults.contains_key(
                &format!("{name}.{}", env::current_account_id())
                    .parse::<AccountId>()
                    .unwrap(),
            )
    }
}

impl GuardianFactory {
    fn assert_owner(&self) {
        require!(env::predecessor_account_id() == self.owner_id, "owner only");
        require!(
            env::attached_deposit() == NearToken::from_yoctonear(1),
            "requires exactly 1 yoctoNEAR"
        );
    }

    fn put_template(&mut self, t: Template) {
        require!(
            !t.id.is_empty() && t.id.len() <= 32,
            "template id must be 1-32 chars"
        );
        require!(
            t.approval_threshold.0 <= t.daily_limit.0,
            "threshold above daily limit"
        );
        require!(t.approved_payees.len() <= MAX_PAYEES, "too many payees");
        self.templates.retain(|x| x.id != t.id);
        self.templates.push(t);
    }
}

/// Why a name is unusable, or None if it's fine. Names become account ids, so they follow
/// NEAR's rules, and `-agent` is reserved for the agent account next to each wallet.
pub fn valid_name(name: &str) -> Option<&'static str> {
    if name.len() < 2 || name.len() > MAX_NAME_LEN {
        return Some("use 2 to 32 characters");
    }
    if !name
        .bytes()
        .all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-' || b == b'_')
    {
        return Some("use lowercase letters, digits, - or _");
    }
    let edges = [name.as_bytes()[0], name.as_bytes()[name.len() - 1]];
    if edges.iter().any(|b| *b == b'-' || *b == b'_') || name.contains("--") || name.contains("__")
    {
        return Some("no separator at the start, at the end, or twice in a row");
    }
    if name.ends_with(AGENT_SUFFIX) {
        return Some("names can't end in -agent");
    }
    None
}

fn check_name(name: &str) {
    if let Some(problem) = valid_name(name) {
        env::panic_str(&format!("bad name: {problem}"));
    }
}

fn promise_succeeded() -> bool {
    env::promise_results_count() == 1 && env::promise_result_checked(0, 64).is_ok()
}

fn emit(event: &str, data: near_sdk::serde_json::Value) {
    env::log_str(&format!(
        "EVENT_JSON:{}",
        json!({ "standard": EVENT_STANDARD, "version": EVENT_VERSION, "event": event, "data": [data] })
    ));
}

#[cfg(test)]
mod tests;
