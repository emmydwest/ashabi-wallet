// The contract's own types come from the SDK, so the dashboard and agents read the same shapes.
import type { PaymentRecord, RequestStatus, WalletStatus } from 'ashabi-wallet-sdk';

export type {
  Guards,
  PaymentRecord,
  PaymentStatus,
  PendingRules,
  RequestStatus,
  WalletStatus,
} from 'ashabi-wallet-sdk';

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
  /** Set when this is the last good state because the RPC could not be reached. */
  stale?: boolean;
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
