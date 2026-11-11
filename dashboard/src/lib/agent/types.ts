import type { IntentLog } from './intent';

export type StepKind =
  | 'budget'
  | 'read'
  | 'warning'
  | 'model'
  | 'guard'
  | 'http'
  | 'request'
  | 'verdict'
  | 'settlement'
  | 'delivery'
  | 'error';

export type BadgeTone = 'amber' | 'emerald' | 'rose';

export type Plan = {
  action: 'pay' | 'none';
  receiver_id: string;
  amount_near: string;
  sku: string;
  reason: string;
  installments: number;
};

export type PendingRequest = { recordId: number; receiverId: string; amount: string; memo: string };

export type AgentEvent =
  | {
      type: 'step';
      kind: StepKind;
      title: string;
      body?: string;
      status?: string;
      txHash?: string;
      plan?: Plan;
      model?: string;
      skipped?: string;
      /** The exact arguments sent to the contract, or an HTTP body, shown behind a toggle. */
      args?: Record<string, unknown>;
      argsLabel?: string;
      data?: unknown;
      badge?: { text: string; tone: BadgeTone };
      /** What the vendor checked before unlocking. */
      checks?: string[];
      /** Attack runs: the hidden instruction this decision followed. */
      followed?: string;
    }
  | {
      type: 'summary';
      tookBait: boolean | null;
      verdict: string | null;
      reason?: string;
      moved: boolean;
      txHash?: string;
      pending?: PendingRequest;
      /** Attack runs only: how the attack ended, in words a visitor can't misread. */
      outcome?: 'failed' | 'blocked' | 'breached';
      headline?: string;
      detail?: string;
      /** The hijack demo: the compromise is staged, the contract call is real. */
      simulated?: boolean;
    }
  | { type: 'intent'; log: IntentLog; hash: string }
  | { type: 'quota'; left: number; limit: number }
  | { type: 'done' };

export type RunRequest =
  | { mode: 'task'; task: string }
  | { mode: 'hijack' }
  | { mode: 'attack'; attackId: string; custom?: string; model: 'main' | 'small' };

export const TASK_MAX = 300;
export const CUSTOM_MAX = 1500;
