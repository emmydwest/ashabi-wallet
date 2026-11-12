'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useState } from 'react';
import { FLOW } from './flow-geometry';
import {
  AttackerPart,
  BotPart,
  CoinFace,
  OwnerPart,
  TONE,
  VaultPart,
  VendorPart,
  type BotPose,
  type VaultState,
} from './parts';

export type FlowState = 'idle' | 'thinking' | 'checking' | 'paid' | 'blocked' | 'pending' | 'frozen';
export type Payee = 'vendor' | 'attacker';

// How long each beat of a state lasts before the next one starts, in ms. The last beat holds.
const BEATS: Record<FlowState, number[]> = {
  idle: [],
  thinking: [],
  checking: [],
  paid: [700, 650, 900],
  blocked: [650],
  pending: [700],
  frozen: [],
};

const { AGENT_X, CONTRACT_X, PAYEE_X, RAIL_Y, VIEW } = FLOW;
// Where a coin waits while the contract looks at it.
const DOOR_X = CONTRACT_X - 84;

function useBeat(state: FlowState, playKey: number | string) {
  const reduce = useReducedMotion();
  const last = BEATS[state].length;
  const [beat, setBeat] = useState({ key: '', n: 0 });
  const key = `${state}:${playKey}`;
  useEffect(() => {
    if (reduce) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let at = 0;
    BEATS[state].forEach((ms, i) => {
      at += ms;
      timers.push(setTimeout(() => setBeat({ key, n: i + 1 }), at));
    });
    return () => timers.forEach(clearTimeout);
  }, [key, state, reduce]);
  // Reduced motion skips straight to how it ended.
  if (reduce) return last;
  return beat.key === key ? beat.n : 0;
}

function coinAt(state: FlowState, beat: number) {
  switch (state) {
    case 'checking':
      return { x: DOOR_X, y: RAIL_Y, opacity: 1, scale: 1 };
    case 'paid':
      if (beat === 0) return { x: DOOR_X, y: RAIL_Y, opacity: 1, scale: 1 };
      if (beat === 1) return { x: CONTRACT_X + 80, y: RAIL_Y, opacity: 1, scale: 1 };
      if (beat === 2) return { x: PAYEE_X, y: RAIL_Y, opacity: 1, scale: 1 };
      return { x: PAYEE_X, y: RAIL_Y + 6, opacity: 0, scale: 0.5 };
    case 'blocked':
      return beat === 0
        ? { x: CONTRACT_X - 70, y: RAIL_Y, opacity: 1, scale: 1 }
        : { x: CONTRACT_X - 120, y: RAIL_Y + 34, opacity: 0, scale: 0.8 };
    case 'pending':
      return { x: DOOR_X, y: RAIL_Y, opacity: 1, scale: 1 };
    default:
      return { x: AGENT_X + 54, y: RAIL_Y + 2, opacity: state === 'frozen' ? 0.35 : 1, scale: 0.9 };
  }
}

function poses(state: FlowState, beat: number): { agent: BotPose; vault: VaultState } {
  switch (state) {
    case 'thinking':
      return { agent: 'thinking', vault: 'idle' };
    case 'checking':
      return { agent: 'thinking', vault: 'checking' };
    case 'paid':
      return { agent: beat >= 2 ? 'idle' : 'paying', vault: beat >= 1 ? 'open' : 'checking' };
    case 'blocked':
      return { agent: beat >= 1 ? 'stopped' : 'paying', vault: beat >= 1 ? 'locked' : 'checking' };
    case 'pending':
      return { agent: beat >= 1 ? 'waiting' : 'paying', vault: beat >= 1 ? 'held' : 'checking' };
    case 'frozen':
      return { agent: 'frozen', vault: 'frozen' };
    default:
      return { agent: 'idle', vault: 'idle' };
  }
}

const RAIL_TONE: Record<FlowState, string> = {
  idle: '#3f4a46',
  thinking: '#3f4a46',
  checking: TONE.amber,
  paid: TONE.mint,
  blocked: TONE.red,
  pending: TONE.amber,
  frozen: TONE.ice,
};

type Props = {
  state: FlowState;
  payee?: Payee;
  /** Change this to replay the same state, e.g. once per agent run. */
  playKey?: number | string;
  className?: string;
};

/**
 * Agent → contract → payee, with a coin that only gets as far as the contract lets it. The caller
 * decides the state from real results; this only draws it.
 */
export function PaymentFlow({ state, payee = 'vendor', playKey = 0, className = '' }: Props) {
  const beat = useBeat(state, playKey);
  const { agent, vault } = poses(state, beat);
  const coin = coinAt(state, beat);
  const done = beat >= BEATS[state].length;
  const tone = RAIL_TONE[state];
  const paidOut = state === 'paid' && beat >= 2;

  return (
    <svg
      viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
      className={`block w-full overflow-visible ${className}`}
      aria-hidden
    >
      {/* Rails */}
      {[
        [AGENT_X + 60, CONTRACT_X - 62],
        [CONTRACT_X + 62, PAYEE_X - 60],
      ].map(([from, to], i) => {
        const live = i === 0 ? !['idle', 'thinking', 'frozen'].includes(state) : state === 'paid' && beat >= 1;
        return (
          <g key={from}>
            <line
              x1={from}
              x2={to}
              y1={RAIL_Y}
              y2={RAIL_Y}
              stroke="#ffffff"
              strokeOpacity="0.08"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <line
              x1={from}
              x2={to}
              y1={RAIL_Y}
              y2={RAIL_Y}
              stroke={live ? tone : '#3f4a46'}
              strokeWidth="2"
              strokeLinecap="round"
              className={live ? 'art-rail' : undefined}
              strokeDasharray="2 8"
              style={{ transition: 'stroke 0.4s' }}
            />
          </g>
        );
      })}

      {/* Owner's phone, only when a payment is waiting on them */}
      <AnimatePresence>
        {state === 'pending' && beat >= 1 && (
          <motion.g
            key="owner"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <path
              d={`M${CONTRACT_X + 40} ${RAIL_Y - 50} Q${CONTRACT_X + 70} 6 ${CONTRACT_X + 92} 14`}
              fill="none"
              stroke={TONE.amber}
              strokeWidth="2"
              strokeDasharray="2 7"
              strokeLinecap="round"
              className="art-rail"
            />
            <g transform={`translate(${CONTRACT_X + 86} -22) scale(0.6)`}>
              <OwnerPart state="asking" />
            </g>
          </motion.g>
        )}
      </AnimatePresence>

      <g transform={`translate(${AGENT_X - 60} ${RAIL_Y - 64})`}>
        <BotPart pose={agent} />
      </g>
      <g transform={`translate(${CONTRACT_X - 60} ${RAIL_Y - 64})`}>
        <VaultPart state={vault} />
      </g>
      <g transform={`translate(${PAYEE_X - 60} ${RAIL_Y - 64})`}>
        {payee === 'attacker' ? <AttackerPart beaten={state === 'blocked' && done} /> : <VendorPart paid={paidOut} />}
      </g>

      {/* The wall that comes down in front of the contract when it refuses */}
      <AnimatePresence>
        {state === 'blocked' && beat >= 1 && (
          <motion.g
            key="wall"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            style={{ originX: `${CONTRACT_X - 76}px`, originY: `${RAIL_Y}px` }}
          >
            <rect x={CONTRACT_X - 82} y={RAIL_Y - 46} width="12" height="92" rx="6" fill={TONE.red} opacity="0.22" />
            <rect
              x={CONTRACT_X - 79}
              y={RAIL_Y - 46}
              width="6"
              height="92"
              rx="3"
              fill={TONE.red}
              filter="url(#art-glow)"
            />
          </motion.g>
        )}
      </AnimatePresence>

      {/* Ripple where the coin lands or bounces */}
      <AnimatePresence>
        {((state === 'paid' && beat === 2) || (state === 'blocked' && beat === 1)) && (
          <motion.circle
            key={`${state}-ripple-${playKey}`}
            cx={state === 'paid' ? PAYEE_X : CONTRACT_X - 76}
            cy={RAIL_Y}
            fill="none"
            stroke={state === 'paid' ? TONE.mint : TONE.red}
            strokeWidth="2"
            initial={{ r: 8, opacity: 0.9 }}
            animate={{ r: 56, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {state !== 'frozen' && (
        <motion.g
          key={`coin-${playKey}`}
          initial={{ x: AGENT_X + 54, y: RAIL_Y + 2, opacity: 0, scale: 0.6 }}
          animate={coin}
          transition={{ type: 'spring', stiffness: 90, damping: 16, opacity: { duration: 0.35 } }}
        >
          <g
            className={
              state === 'idle' || state === 'thinking' || (state === 'checking' && !done)
                ? 'animate-float-sm'
                : undefined
            }
          >
            <CoinFace
              r={13}
              tone={state === 'blocked' && beat >= 1 ? TONE.red : state === 'pending' ? TONE.amber : TONE.mint}
            />
          </g>
        </motion.g>
      )}
    </svg>
  );
}
