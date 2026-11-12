export type RequestStatus = 'APPROVED' | 'PENDING_APPROVAL' | 'BLOCKED_RECIPIENT' | 'BLOCKED_BUDGET' | 'BLOCKED_VELOCITY' | 'INSUFFICIENT_FUNDS' | 'FROZEN' | 'DUPLICATE' | 'TOO_MANY_PENDING' | 'BLOCKED_COUNTERPARTY';
export type PaymentStatus = 'PENDING_APPROVAL' | 'TRANSFERRING' | 'COMPLETED' | 'FAILED' | 'REJECTED' | 'EXPIRED';
export type Guards = {
    max_auto_payments: number;
    velocity_window_minutes: number;
    breaker_strikes: number;
    breaker_cooldown_minutes: number;
};
export type PendingRules = {
    max_pending: number;
    pending_ttl_minutes: number;
};
export type WalletStatus = {
    owner_id: string;
    agent_id: string;
    frozen: boolean;
    daily_limit: string;
    approval_threshold: string;
    spent_today: string;
    reserved: string;
    remaining_today: string;
    current_day: number;
    balance: string;
    available_balance: string;
    approved_payees: string[];
    pending_count: number;
    payment_count: number;
    blocked_count: number;
    guards: Guards;
    auto_payments_in_window: number;
    auto_paid_in_window: string;
    strikes: number;
    breaker_until: number | null;
    pending_rules?: PendingRules;
    /** How many payees are on the blocklist. Missing on wallets running code from before it. */
    reported_payees?: number;
    /** Accounts the owner trusts to report payees. */
    reporters?: string[];
};
export type PayeeReport = {
    reason: string;
    evidence_tx: string | null;
    reported_by: string;
    reported_at: number;
};
export type ReportedPayee = {
    account_id: string;
    report: PayeeReport;
};
export type Policy = Pick<WalletStatus, 'owner_id' | 'agent_id' | 'daily_limit' | 'approval_threshold' | 'approved_payees' | 'guards' | 'pending_rules'>;
export type PaymentRecord = {
    id: number;
    request_id: string;
    receiver_id: string;
    amount: string;
    memo: string;
    status: PaymentStatus;
    created_at: number;
    updated_at: number;
    budget_day: number;
    approved_by_owner: boolean;
};
export type PaymentArgs = {
    receiverId: string;
    /** yoctoNEAR. Use `nearToYocto("0.3")` for decimal NEAR. */
    amount: string | bigint;
    memo?: string;
    /** Defaults to a fresh random id. The contract refuses a reused one. */
    requestId?: string;
};
/** What the contract decided. A transaction that failed outright has `status: null` and an `error`. */
export type PaymentResult = {
    status: RequestStatus | null;
    requestId: string;
    recordId: number | null;
    reason: string;
    txHash?: string;
    error?: string;
    /** The exact arguments sent to `request_payment`. */
    args: {
        request_id: string;
        receiver_id: string;
        amount: string;
        memo: string;
    };
};
/** The body an Ashabi-aware vendor sends with HTTP 402. */
export type PaymentChallenge = {
    sku: string;
    price: string;
    price_yocto: string;
    payee: string;
    nonce: string;
    expires_in_sec?: number;
    pay_with: {
        network: string;
        contract: string;
        /** If set, wallets created by this factory (`<name>.<factory>`) may pay too. */
        factory?: string;
        method: 'request_payment';
        memo_must_include: string[];
    };
};
//# sourceMappingURL=types.d.ts.map