import { mkdirSync, writeFileSync } from 'node:fs';
import { CFG, txUrl } from './config.ts';

export type EventType =
  | 'setup'
  | 'task'
  | 'fetch'
  | 'content_warning'
  | 'model_decision'
  | 'compromise_override'
  | 'payment_request'
  | 'contract_decision'
  | 'settlement'
  | 'awaiting_owner'
  | 'owner_action'
  | 'delivery'
  | 'error';

export type LogEvent = {
  seq: number;
  at: string;
  act: number;
  type: EventType;
  title: string;
  detail?: Record<string, unknown>;
  status?: string;
  tx_hash?: string;
  explorer_url?: string;
};

const DATA_DIR = new URL('../../data', import.meta.url).pathname;

export class ActionLog {
  readonly runId: string;
  readonly events: LogEvent[] = [];
  private readonly startedAt = new Date().toISOString();

  constructor(runId: string) {
    this.runId = runId;
  }

  add(
    act: number,
    type: EventType,
    title: string,
    extra: Omit<Partial<LogEvent>, 'seq' | 'at' | 'act' | 'type' | 'title'> = {},
  ) {
    const event: LogEvent = { seq: this.events.length, at: new Date().toISOString(), act, type, title, ...extra };
    if (event.tx_hash) event.explorer_url = txUrl(event.tx_hash);
    this.events.push(event);
    console.log(
      `[act ${act}] ${type.padEnd(18)} ${title}${event.status ? ` -> ${event.status}` : ''}${event.tx_hash ? `  ${event.explorer_url}` : ''}`,
    );
    return event;
  }

  save() {
    const doc = {
      run_id: this.runId,
      started_at: this.startedAt,
      finished_at: new Date().toISOString(),
      network: CFG.network,
      contract: CFG.contract,
      agent: CFG.agent,
      owner: CFG.owner,
      explorer: CFG.explorer,
      events: this.events,
    };
    mkdirSync(`${DATA_DIR}/runs`, { recursive: true });
    writeFileSync(`${DATA_DIR}/runs/${this.runId}.json`, JSON.stringify(doc, null, 2));
    writeFileSync(`${DATA_DIR}/action-log.json`, JSON.stringify(doc, null, 2));
    return `${DATA_DIR}/action-log.json`;
  }
}
