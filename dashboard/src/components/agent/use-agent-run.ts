'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentEvent, RunRequest } from '@/lib/agent/types';

type Step = Extract<AgentEvent, { type: 'step' }>;
type Summary = Extract<AgentEvent, { type: 'summary' }>;

export function useAgentRun(onFinish?: () => void) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ left: number; limit: number } | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    fetch('/api/agent/run', { cache: 'no-store' })
      .then((res) => res.json())
      .then(setQuota)
      .catch(() => {});
  }, []);

  const run = useCallback(
    async (input: RunRequest) => {
      if (busy.current) return;
      busy.current = true;
      setRunning(true);
      setSteps([]);
      setSummary(null);
      setError(null);
      try {
        const res = await fetch('/api/agent/run', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(input),
        });
        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 429) setQuota((q) => (q ? { ...q, left: 0 } : q));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as AgentEvent;
            if (event.type === 'step') setSteps((s) => [...s, event]);
            else if (event.type === 'summary') setSummary(event);
            else if (event.type === 'quota') setQuota({ left: event.left, limit: event.limit });
          }
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        busy.current = false;
        setRunning(false);
        onFinish?.();
      }
    },
    [onFinish],
  );

  return { steps, summary, running, error, quota, run };
}
