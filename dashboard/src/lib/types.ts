export type RequestStatus =
  | 'APPROVED'
  | 'PENDING_APPROVAL'
  | 'BLOCKED_RECIPIENT'
  | 'BLOCKED_BUDGET'
  | 'BLOCKED_VELOCITY'
  | 'INSUFFICIENT_FUNDS'
  | 'FROZEN'
  | 'DUPLICATE';

export type PaymentStatus = 'PENDING_APPROVAL' | 'TRANSFERRING' | 'COMPLETED' | 'FAILED' | 'REJECTED';

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
};

export type Guards = {
  max_auto_payments: number;
  velocity_window_minutes: number;
  breaker_strikes: number;
  breaker_cooldown_minutes: number;
};

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

export type BlockedAttempt = {
  seq: number;
  request_id: string;
  caller: string;
  receiver_id: string;
  amount: string;
  memo: string;
  status: RequestStatus;
  reason: string;
  timestamp: number;
};

export type FeedItem =
  | { kind: 'payment'; key: string; at: number; txHash?: string; record: PaymentRecord }
  | { kind: 'blocked'; key: string; at: number; txHash?: string; attempt: BlockedAttempt };

export type GuardianSnapshot = {
  status: WalletStatus;
  pending: PaymentRecord[];
  feed: FeedItem[];
  fetchedAt: string;
};

export type LogEvent = {
  seq: number;
  at: string;
  act: number;
  type: string;
  title: string;
  detail?: Record<string, unknown>;
  status?: string;
  tx_hash?: string;
  explorer_url?: string;
};

export type ActionLog = {
  run_id: string;
  started_at: string;
  finished_at: string;
  contract: string;
  events: LogEvent[];
};
