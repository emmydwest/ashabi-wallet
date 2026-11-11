import type { Policy, PaymentArgs, PaymentChallenge, PaymentRecord, PaymentResult, WalletStatus } from './types.ts';
export type * from './types.ts';
export type GuardianAgentOptions = {
    /** The guardian contract, e.g. `guardian.gw-emmy.testnet`. */
    contractId: string;
    /** The agent account registered on the contract. */
    agentId: string;
    /**
     * Sends `request_payment` as the agent. Use `accountSigner(account)` with a near-api-js
     * Account holding a function-call key, or bring your own (a TEE, a KMS, a wallet). Keep it server-side.
     */
    signer?: Signer;
    /** Tried in order; the next one is used if one fails or times out. */
    rpcUrls?: string[];
    timeoutMs?: number;
};
export declare const TESTNET_RPCS: string[];
export type FunctionCall = {
    contractId: string;
    methodName: string;
    args: Record<string, unknown>;
    gas: bigint;
    deposit: bigint;
};
/** The final execution outcome, as NEAR RPC returns it. */
export type FinalOutcome = {
    transaction?: {
        hash: string;
    };
    transaction_outcome?: {
        id: string;
    };
    status?: {
        SuccessValue?: string;
        Failure?: unknown;
    } | string;
};
export type Signer = (call: FunctionCall) => Promise<FinalOutcome>;
/** Wraps a near-api-js (v6+) Account. Kept structural so the SDK has no dependencies. */
export declare function accountSigner(account: {
    callFunctionRaw(call: FunctionCall): Promise<unknown>;
}): Signer;
export declare function nearToYocto(near: string): bigint;
/**
 * The agent's side of a Guardian Wallet. It can only ask for payments; the contract decides.
 * Read methods need no key.
 */
export declare class GuardianAgent {
    readonly contractId: string;
    readonly agentId: string;
    private readonly signer?;
    private readonly rpcUrls;
    private readonly timeoutMs;
    constructor(options: GuardianAgentOptions);
    get canSign(): boolean;
    view<T>(method: string, args?: Record<string, unknown>): Promise<T>;
    getStatus(): Promise<WalletStatus>;
    getPolicy(): Promise<Policy>;
    getPayment(recordId: number): Promise<PaymentRecord | null>;
    /** Polls until the transfer for `recordId` has settled, or the timeout passes. */
    waitForSettlement(recordId: number, timeoutMs?: number): Promise<PaymentRecord | null>;
    requestPayment({ receiverId, amount, memo, requestId }: PaymentArgs): Promise<PaymentResult>;
    /**
     * Fetches `url`; if it answers 402 with a Guardian payment challenge, pays it through the
     * contract and retries with `X-NEAR-Receipt-Tx`. Hooks let a caller log or veto each step.
     */
    pay402(url: string, options?: Pay402Options): Promise<Pay402Result>;
    private rpc;
}
export type Pay402Options = {
    /** Refuse challenges above this price, in yoctoNEAR. */
    maxPrice?: string | bigint;
    /** Only pay these accounts. The contract's allowlist still applies either way. */
    allowedPayees?: string[];
    /** Extra memo tags, e.g. `intent:<hash>`. */
    memoTags?: string[];
    /** A short human reason appended to the memo. */
    reason?: string;
    onChallenge?: (challenge: PaymentChallenge) => boolean | void | Promise<boolean | void>;
    onRequest?: (request: PaymentArgs) => void | Promise<void>;
    onPayment?: (payment: PaymentResult) => void | Promise<void>;
    onSettled?: (record: PaymentRecord | null) => void | Promise<void>;
    fetch?: typeof fetch;
};
export type Pay402Result = {
    kind: 'free';
    response: Response;
} | {
    kind: 'refused';
    challenge: PaymentChallenge;
    reason: string;
} | {
    kind: 'not-paid';
    challenge: PaymentChallenge;
    payment: PaymentResult;
    record?: PaymentRecord | null;
} | {
    kind: 'paid' | 'receipt-refused';
    challenge: PaymentChallenge;
    payment: PaymentResult;
    record: PaymentRecord | null;
    response: Response;
};
//# sourceMappingURL=index.d.ts.map