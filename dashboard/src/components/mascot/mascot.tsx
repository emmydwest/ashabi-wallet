'use client';

import Image from 'next/image';
import { useId } from 'react';

export type Mood = 'happy' | 'thinking' | 'alert' | 'blocked' | 'approved';

const LABEL: Record<Mood, string> = {
  happy: 'Guardian, smiling',
  thinking: 'Guardian, checking the rules',
  alert: 'Guardian, waiting on you',
  blocked: 'Guardian, payment blocked',
  approved: 'Guardian, payment approved',
};

const COLOR: Record<Mood, string> = {
  happy: '#3df2a6',
  thinking: '#3df2a6',
  alert: '#fbbf24',
  blocked: '#fb7185',
  approved: '#3df2a6',
};

// Below this size the dot matrix is finer than a pixel, so the pre-rendered face reads better.
const LIVE_EYES_FROM = 112;

type MascotProps = {
  mood?: Mood;
  size?: number;
  className?: string;
  priority?: boolean;
  /** Decorative copies next to text that already says the same thing. */
  decorative?: boolean;
  /** Fill the parent's width instead of a fixed size; `size` then only picks the image resolution. */
  fluid?: boolean;
};

export function Mascot({ mood = 'happy', size = 160, className = '', priority, decorative, fluid }: MascotProps) {
  const label = decorative ? undefined : LABEL[mood];
  if (size < LIVE_EYES_FROM && !fluid) {
    return (
      <Image
        src={`/mascot/${mood}-128.webp`}
        alt={label ?? ''}
        width={size}
        height={size}
        className={`select-none ${className}`}
        priority={priority}
        draggable={false}
      />
    );
  }
  return (
    <div
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={decorative || undefined}
      className={`relative shrink-0 select-none ${fluid ? 'aspect-square w-full' : ''} ${className}`}
      style={fluid ? undefined : { width: size, height: size }}
    >
      <Image
        src="/mascot/blank.webp"
        alt=""
        fill
        sizes={`${size}px`}
        priority={priority}
        draggable={false}
        className="object-contain"
      />
      <Eyes mood={mood} />
    </div>
  );
}

// The visor in the artwork, as a share of the image, measured off the 840px crop.
const VISOR = { left: '12.3%', top: '32.4%', width: '75%', height: '45.8%' };
const LEFT = 160;
const RIGHT = 470;
const MID = 178;

function Eyes({ mood }: { mood: Mood }) {
  const id = useId().replace(/:/g, '');
  const color = COLOR[mood];
  return (
    <svg viewBox="0 0 630 385" className="pointer-events-none absolute" style={VISOR} aria-hidden>
      <defs>
        <pattern id={`${id}-dots`} width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="3.4" fill="white" />
        </pattern>
        <mask id={`${id}-mask`}>
          <rect width="630" height="385" fill={`url(#${id}-dots)`} />
        </mask>
      </defs>
      <g style={{ filter: `drop-shadow(0 0 7px ${color}) drop-shadow(0 0 18px ${color}88)` }}>
        <g key={mood} mask={`url(#${id}-mask)`} className="animate-in">
          <Face mood={mood} color={color} />
        </g>
      </g>
    </svg>
  );
}

function Face({ mood, color }: { mood: Mood; color: string }) {
  const stroke = { stroke: color, strokeWidth: 30, strokeLinecap: 'round' as const, fill: 'none' };
  switch (mood) {
    case 'happy':
      return (
        <g className="animate-blink">
          {[LEFT, RIGHT].map((x) => (
            <path key={x} d={`M${x - 62} ${MID + 30} A62 62 0 0 1 ${x + 62} ${MID + 30}`} {...stroke} />
          ))}
        </g>
      );
    case 'thinking':
      return (
        <>
          <g className="animate-blink">
            {[LEFT, RIGHT].map((x) => (
              <ellipse key={x} cx={x} cy={MID - 12} rx="52" ry="34" fill={color} />
            ))}
          </g>
          {[-56, 0, 56].map((dx, i) => (
            <circle
              key={dx}
              cx={315 + dx}
              cy={MID + 100}
              r="15"
              fill={color}
              className="animate-dot-wait"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </>
      );
    case 'alert':
      return (
        <>
          {[LEFT, RIGHT].map((x) => (
            <circle key={x} cx={x} cy={MID} r="56" {...stroke} strokeWidth={26} />
          ))}
          <circle cx="315" cy={MID + 92} r="17" fill={color} className="animate-dot-wait" />
        </>
      );
    case 'blocked':
      return (
        <>
          {[LEFT, RIGHT].map((x) => (
            <path
              key={x}
              d={`M${x - 52} ${MID - 52} L${x + 52} ${MID + 52} M${x + 52} ${MID - 52} L${x - 52} ${MID + 52}`}
              {...stroke}
            />
          ))}
        </>
      );
    case 'approved':
      return <path d="M205 188 L282 262 L430 104" {...stroke} strokeWidth={38} strokeLinejoin="round" />;
  }
}
