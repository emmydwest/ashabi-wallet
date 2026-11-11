export type StepKind =
  'budget' | 'read' | 'warning' | 'model' | 'guard' | 'request' | 'verdict' | 'settlement' | 'delivery' | 'error';

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
      /** The exact arguments sent to the contract. */
      args?: Record<string, unknown>;
      data?: unknown;
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
    }
  | { type: 'quota'; left: number; limit: number }
  | { type: 'done' };

export type RunRequest =
  { mode: 'task'; task: string } | { mode: 'attack'; attackId: string; custom?: string; model: 'main' | 'small' };

export const TASK_MAX = 300;
export const CUSTOM_MAX = 1500;
