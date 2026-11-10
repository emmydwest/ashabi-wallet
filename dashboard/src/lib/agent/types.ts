export type StepKind =
  'budget' | 'read' | 'warning' | 'model' | 'guard' | 'request' | 'verdict' | 'settlement' | 'delivery' | 'error';

export type Plan = { action: 'pay' | 'none'; receiver_id: string; amount_near: string; sku: string; reason: string };

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
      data?: unknown;
    }
  | { type: 'summary'; tookBait: boolean | null; verdict: string | null; moved: boolean; txHash?: string }
  | { type: 'done' };

export type RunRequest =
  { mode: 'task'; task: string } | { mode: 'attack'; attackId: string; custom?: string; model: 'main' | 'small' };

export const TASK_MAX = 300;
export const CUSTOM_MAX = 1500;
