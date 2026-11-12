import { CoinFace } from '@/components/art/parts';
import { Mascot } from '@/components/mascot/mascot';

// The glowing platform the mascot floats over. Pure decoration; the live card sits beside it.
export function HeroStage() {
  return (
    <div className="relative mx-auto grid aspect-square w-full max-w-[36rem] place-items-center" aria-hidden>
      <div className="animate-glow absolute inset-[12%] rounded-full bg-emerald-400/25 blur-3xl" />
      <svg viewBox="0 0 400 400" className="absolute inset-0 size-full">
        <defs>
          <radialGradient id="stage-floor" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3df2a6" stopOpacity="0.35" />
            <stop offset="70%" stopColor="#3df2a6" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#3df2a6" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="200" r="186" fill="none" stroke="#3df2a6" strokeOpacity="0.12" />
        <g className="animate-spin-slow" style={{ transformOrigin: '200px 200px' }}>
          <circle cx="200" cy="200" r="164" fill="none" stroke="#3df2a6" strokeOpacity="0.35" strokeDasharray="2 10" />
        </g>
        <ellipse cx="200" cy="336" rx="150" ry="30" fill="url(#stage-floor)" />
        <ellipse
          cx="200"
          cy="336"
          rx="128"
          ry="22"
          fill="none"
          stroke="#8bfad0"
          strokeOpacity="0.75"
          strokeWidth="1.5"
        />
        <ellipse cx="200" cy="336" rx="96" ry="15" fill="none" stroke="#3df2a6" strokeOpacity="0.4" />
        {/* The allowance, floating where the agent can see it but not grab it. */}
        {[
          { x: 62, y: 120, r: 13, delay: '0s' },
          { x: 342, y: 92, r: 10, delay: '-2.2s' },
          { x: 352, y: 262, r: 15, delay: '-4.1s' },
          { x: 50, y: 280, r: 9, delay: '-1.3s' },
        ].map((c) => (
          <g key={c.x} transform={`translate(${c.x} ${c.y})`}>
            <g className="animate-coin-drift" style={{ animationDelay: c.delay }}>
              <CoinFace r={c.r} />
            </g>
          </g>
        ))}
      </svg>
      <div className="animate-float relative -mt-[12%] w-[72%]">
        <Mascot size={320} fluid priority decorative />
      </div>
    </div>
  );
}
