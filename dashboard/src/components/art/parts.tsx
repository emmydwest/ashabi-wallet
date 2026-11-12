// The illustration set, drawn in the mascot's style: glossy white shells, black visors and
// glowing dot-matrix faces. Each part is a <g> on a 120×120 grid so the flow scene can place
// them; pieces.tsx wraps them as standalone <svg>s. They rely on <ArtDefs /> being on the page.

export const TONE = {
  mint: '#3df2a6',
  amber: '#fbbf24',
  red: '#fb7185',
  ice: '#7dd3fc',
} as const;

export type BotPose = 'idle' | 'thinking' | 'paying' | 'stopped' | 'frozen' | 'waiting';

const POSE_TONE: Record<BotPose, string> = {
  idle: TONE.mint,
  thinking: TONE.mint,
  paying: TONE.mint,
  stopped: TONE.red,
  frozen: TONE.ice,
  waiting: TONE.amber,
};

/** Draws its children as lit LEDs: a soft halo, then the dots themselves. */
export function Leds({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <g>
      <g opacity="0.35" filter="url(#art-glow)" stroke={color} fill={color}>
        {children}
      </g>
      <g mask="url(#art-leds)" stroke={color} fill={color} filter="url(#art-glow)">
        {children}
      </g>
    </g>
  );
}

function Visor({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={r} fill="url(#art-visor)" stroke="#2b3034" strokeWidth="1" />
      <path
        d={`M${x + r * 0.7} ${y + 3} H${x + w * 0.62} Q${x + w * 0.4} ${y + h * 0.42} ${x + 4} ${y + h * 0.5} V${y + r * 0.8} Q${x + 4} ${y + 3} ${x + r * 0.7} ${y + 3} Z`}
        fill="url(#art-gloss)"
      />
    </>
  );
}

function Shield({ x, y, s = 1, stroke = '#22272b' }: { x: number; y: number; s?: number; stroke?: string }) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 -5.5 L5 -3.6 V0.6 C5 3.4 2.8 5.2 0 6.4 C-2.8 5.2 -5 3.4 -5 0.6 V-3.6 Z"
      fill="none"
      stroke={stroke}
      strokeWidth={1.6 / s}
      strokeLinejoin="round"
    />
  );
}

const line = { fill: 'none', strokeWidth: 4.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function BotFace({ pose }: { pose: BotPose }) {
  const c = POSE_TONE[pose];
  switch (pose) {
    case 'thinking':
      return (
        <>
          <Leds color={c}>
            <g className="art-blink">
              <ellipse cx="46" cy="61" rx="6" ry="4.2" stroke="none" />
              <ellipse cx="74" cy="61" rx="6" ry="4.2" stroke="none" />
            </g>
          </Leds>
          {[52, 60, 68].map((x, i) => (
            <circle
              key={x}
              cx={x}
              cy="73"
              r="1.9"
              fill={c}
              className="animate-dot-wait"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </>
      );
    case 'stopped':
      return (
        <Leds color={c}>
          <path d="M40 57 L52 69 M52 57 L40 69 M68 57 L80 69 M80 57 L68 69" {...line} />
        </Leds>
      );
    case 'frozen':
      return (
        <Leds color={c}>
          <path d="M39 64 H53 M67 64 H81" {...line} />
        </Leds>
      );
    case 'waiting':
      return (
        <Leds color={c}>
          <circle cx="46" cy="62" r="6" {...line} strokeWidth={3.6} />
          <circle cx="74" cy="62" r="6" {...line} strokeWidth={3.6} />
        </Leds>
      );
    default:
      return (
        <Leds color={c}>
          <g className="art-blink">
            <path d="M39 67 A7 7 0 0 1 53 67 M67 67 A7 7 0 0 1 81 67" {...line} />
          </g>
        </Leds>
      );
  }
}

/** The agent: the mascot's head, redrawn as vectors so it can change pose and move. */
export function BotPart({ pose = 'idle' }: { pose?: BotPose }) {
  const frozen = pose === 'frozen';
  return (
    <g>
      <ellipse cx="60" cy="64" rx="44" ry="40" fill={POSE_TONE[pose]} opacity="0.18" filter="url(#art-soft)" />
      {/* Ear pods */}
      {[13, 99].map((x) => (
        <g key={x}>
          <rect x={x} y="48" width="8" height="30" rx="4" fill="url(#art-metal)" />
          <rect
            x={x + 2}
            y="52"
            width="4"
            height="22"
            rx="2"
            fill="none"
            stroke={POSE_TONE[pose]}
            strokeOpacity="0.7"
          />
        </g>
      ))}
      <path
        d="M60 18 C88 18 104 36 104 62 C104 90 86 106 60 106 C34 106 16 90 16 62 C16 36 32 18 60 18 Z"
        fill="url(#art-shell)"
        stroke="#ffffff"
        strokeOpacity="0.5"
        strokeWidth="0.6"
      />
      <path d="M30 40 Q60 30 90 40" fill="none" stroke="#9aa3ab" strokeOpacity="0.45" strokeWidth="0.8" />
      <path d="M38 99 Q60 104 82 99" fill="none" stroke="#9aa3ab" strokeOpacity="0.4" strokeWidth="0.8" />
      {frozen && <FrostShell />}
      <Shield x={60} y={30} s={0.9} />
      <Visor x={24} y={44} w={72} h={40} r={17} />
      <BotFace pose={pose} />
      {frozen && <Frost />}
      {pose === 'paying' && (
        <g className="art-coin-out">
          <g transform="translate(96 92)">
            <CoinFace r={10} />
          </g>
        </g>
      )}
    </g>
  );
}

function FrostShell() {
  return (
    <path
      className="art-frost"
      d="M60 18 C88 18 104 36 104 62 C104 90 86 106 60 106 C34 106 16 90 16 62 C16 36 32 18 60 18 Z"
      fill="url(#art-frost)"
      opacity="0.6"
    />
  );
}

/** Icicles and frost flakes, for a wallet the owner froze or the kill-switch paused. */
function Frost() {
  return (
    <g className="art-frost">
      {/* Icicles off the visor's lower edge */}
      <path
        d="M36 84 l2.5 8 l2.5 -8 M50 84 l2 6 l2 -6 M66 84 l2.5 9 l2.5 -9 M80 84 l2 5 l2 -5"
        fill="#e0f2fe"
        opacity="0.9"
      />
      {[
        [26, 30, 1],
        [94, 36, 0.8],
        [100, 88, 0.7],
      ].map(([x, y, s]) => (
        <g
          key={`${x}-${y}`}
          transform={`translate(${x} ${y}) scale(${s})`}
          stroke="#e0f2fe"
          strokeWidth="1.4"
          strokeLinecap="round"
        >
          <path d="M0 -7 V7 M-6 -3.5 L6 3.5 M-6 3.5 L6 -3.5" />
          <path d="M-2 -5 L0 -7 L2 -5 M-2 5 L0 7 L2 5" fill="none" />
        </g>
      ))}
    </g>
  );
}

/** Someone trying to get paid who shouldn't be: same family of robot, dark shell, red eyes. */
export function AttackerPart({ beaten = false }: { beaten?: boolean }) {
  const c = TONE.red;
  return (
    <g opacity={beaten ? 0.55 : 1}>
      <ellipse cx="60" cy="66" rx="42" ry="38" fill={c} opacity="0.16" filter="url(#art-soft)" />
      {/* Hood */}
      <path
        d="M60 10 C92 10 110 34 110 66 C110 92 104 106 96 112 Q60 104 24 112 C16 106 10 92 10 66 C10 34 28 10 60 10 Z"
        fill="#141619"
        stroke="#2b3034"
      />
      <path
        d="M60 22 C86 22 100 40 100 64 C100 90 84 104 60 104 C36 104 20 90 20 64 C20 40 34 22 60 22 Z"
        fill="url(#art-shell-dark)"
        stroke="#4a5056"
        strokeWidth="0.6"
      />
      <Visor x={27} y={46} w={66} h={38} r={16} />
      <Leds color={c}>
        <path d="M38 58 L52 64 M82 58 L68 64" {...line} />
        <path d="M44 74 Q60 68 76 74" {...line} strokeWidth={3.4} />
      </Leds>
    </g>
  );
}

export type VaultState = 'idle' | 'checking' | 'open' | 'locked' | 'held' | 'frozen';

const VAULT_TONE: Record<VaultState, string> = {
  idle: TONE.mint,
  checking: TONE.amber,
  open: TONE.mint,
  locked: TONE.red,
  held: TONE.amber,
  frozen: TONE.ice,
};

/** The contract: a vault in the same white shell, its door the mascot's visor. */
export function VaultPart({ state = 'idle' }: { state?: VaultState }) {
  const c = VAULT_TONE[state];
  return (
    <g>
      <ellipse cx="60" cy="64" rx="46" ry="40" fill={c} opacity="0.16" filter="url(#art-soft)" />
      <rect x="28" y="100" width="12" height="8" rx="2" fill="url(#art-metal)" />
      <rect x="80" y="100" width="12" height="8" rx="2" fill="url(#art-metal)" />
      <rect
        x="16"
        y="18"
        width="88"
        height="86"
        rx="18"
        fill="url(#art-shell)"
        stroke="#fff"
        strokeOpacity="0.5"
        strokeWidth="0.6"
      />
      <Shield x={60} y={27} s={0.75} />
      <Visor x={25} y={35} w={70} h={60} r={14} />
      {/* Hinges */}
      <rect x="20" y="46" width="4" height="10" rx="2" fill="url(#art-metal)" />
      <rect x="20" y="74" width="4" height="10" rx="2" fill="url(#art-metal)" />
      <g className={state === 'checking' ? 'art-spin' : undefined} style={{ transformOrigin: '60px 65px' }}>
        <Leds color={c}>
          <circle cx="60" cy="65" r="17" fill="none" strokeWidth="3.4" strokeDasharray="5 3.2" />
          {(state === 'idle' || state === 'checking') && (
            <path d="M60 52 V56 M60 74 V78 M47 65 H51 M69 65 H73" fill="none" strokeWidth="3" strokeLinecap="round" />
          )}
        </Leds>
      </g>
      <Leds color={c}>
        {state === 'locked' ? (
          <path d="M54 59 L66 71 M66 59 L54 71" {...line} strokeWidth={3.8} />
        ) : state === 'open' ? (
          <path d="M52.5 65.5 L58 71 L68 59.5" {...line} strokeWidth={3.8} />
        ) : state === 'held' ? (
          <path d="M60 57 V66 L65 69" {...line} strokeWidth={3.4} />
        ) : (
          <circle cx="60" cy="65" r="3.4" stroke="none" />
        )}
      </Leds>
      {state === 'frozen' && (
        <g className="art-frost">
          <rect x="16" y="18" width="88" height="86" rx="18" fill="url(#art-frost)" opacity="0.5" />
          <path d="M34 95 l2.5 8 l2.5 -8 M56 95 l2 6 l2 -6 M78 95 l2.5 9 l2.5 -9" fill="#e0f2fe" />
        </g>
      )}
    </g>
  );
}

/** A payee: the API shop the agent buys from, as a little kiosk with a dot-matrix screen. */
export function VendorPart({ paid = false }: { paid?: boolean }) {
  const c = TONE.mint;
  return (
    <g>
      <ellipse cx="60" cy="68" rx="44" ry="36" fill={c} opacity={paid ? 0.24 : 0.12} filter="url(#art-soft)" />
      <rect
        x="22"
        y="38"
        width="76"
        height="66"
        rx="12"
        fill="url(#art-shell)"
        stroke="#fff"
        strokeOpacity="0.5"
        strokeWidth="0.6"
      />
      {/* Awning */}
      <path d="M16 38 L24 20 H96 L104 38 Z" fill="url(#art-metal)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M${24 + i * 14.4} 20 L${16 + i * 17.6} 38 H${16 + (i + 0.5) * 17.6} L${24 + (i + 0.5) * 14.4} 20 Z`}
          fill={c}
          opacity="0.85"
        />
      ))}
      <path
        d="M16 38 Q25 45 33.6 38 Q42.4 45 51.2 38 Q60 45 68.8 38 Q77.6 45 86.4 38 Q95.2 45 104 38"
        fill="#e7ebee"
        stroke="#9aa3ab"
        strokeWidth="0.6"
      />
      <Visor x={30} y={50} w={60} h={40} r={9} />
      <Leds color={c}>
        {paid ? (
          <path d="M48 70 L56 78 L73 60" {...line} />
        ) : (
          <path d="M42 80 V72 M52 80 V64 M62 80 V68 M72 80 V60" fill="none" strokeWidth="4.2" strokeLinecap="round" />
        )}
      </Leds>
    </g>
  );
}

export type OwnerState = 'idle' | 'asking' | 'approved';

/** The owner's phone, where anything over the limit waits for a tap. */
export function OwnerPart({ state = 'idle' }: { state?: OwnerState }) {
  const c = state === 'asking' ? TONE.amber : TONE.mint;
  return (
    <g>
      <ellipse
        cx="60"
        cy="62"
        rx="34"
        ry="46"
        fill={c}
        opacity={state === 'asking' ? 0.28 : 0.14}
        filter="url(#art-soft)"
      />
      <rect
        x="34"
        y="12"
        width="52"
        height="98"
        rx="12"
        fill="url(#art-shell)"
        stroke="#fff"
        strokeOpacity="0.5"
        strokeWidth="0.6"
      />
      <rect x="38.5" y="20" width="43" height="82" rx="8" fill="url(#art-visor)" stroke="#2b3034" />
      <rect x="53" y="15" width="14" height="2.4" rx="1.2" fill="#9aa3ab" />
      <Leds color={c}>
        {state === 'asking' ? (
          <>
            <path d="M60 44 V62" {...line} />
            <circle cx="60" cy="72" r="2.6" stroke="none" />
          </>
        ) : state === 'approved' ? (
          <path d="M49 61 L57 69 L72 52" {...line} />
        ) : (
          <circle cx="60" cy="61" r="10" {...line} strokeWidth={3.4} />
        )}
        <rect x="47" y="86" width="26" height="6" rx="3" stroke="none" opacity="0.8" />
      </Leds>
    </g>
  );
}

/** The agent's restricted key: it can ask the contract for a payment, nothing else. */
export function KeyPart() {
  return (
    <g>
      <ellipse cx="60" cy="60" rx="44" ry="30" fill={TONE.mint} opacity="0.14" filter="url(#art-soft)" />
      <g transform="rotate(-28 60 60)">
        <path
          d="M40 40 a20 20 0 1 1 0 40 a20 20 0 1 1 0 -40 Z M40 52 a8 8 0 1 0 0 16 a8 8 0 1 0 0 -16 Z"
          fill="url(#art-shell)"
          fillRule="evenodd"
          stroke="#fff"
          strokeOpacity="0.5"
          strokeWidth="0.6"
        />
        <path
          d="M58 55 H104 a4 4 0 0 1 0 10 H100 V74 H92 V65 H86 V71 H79 V65 H58 Z"
          fill="url(#art-shell)"
          stroke="#9aa3ab"
          strokeWidth="0.6"
        />
      </g>
      {/* Scope tag: the one method this key may call */}
      <g transform="translate(70 76)">
        <rect width="40" height="22" rx="7" fill="url(#art-visor)" stroke="#2b3034" />
        <Leds color={TONE.mint}>
          <path d="M9 11 H31" {...line} strokeWidth={3.6} />
        </Leds>
      </g>
    </g>
  );
}

/** One coin. Mint-silver, with the shield struck in the middle; no chain logo. */
export function CoinPart({ x = 0, y = 0, r = 12, tone }: { x?: number; y?: number; r?: number; tone?: string }) {
  const ry = r * 0.42;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M${-r} 0 V${ry * 0.9} A${r} ${ry} 0 0 0 ${r} ${ry * 0.9} V0 Z`} fill="url(#art-coin-edge)" />
      <ellipse rx={r} ry={ry} fill="url(#art-coin)" stroke={tone ?? '#3df2a6'} strokeOpacity="0.8" strokeWidth="0.8" />
      <ellipse rx={r * 0.68} ry={ry * 0.68} fill="none" stroke="#0b6b47" strokeOpacity="0.35" strokeWidth="0.8" />
      <path
        transform={`scale(${r / 22} ${(r / 22) * 0.42})`}
        d="M0 -6 L5 -4 V0.6 C5 3.4 2.8 5.2 0 6.4 C-2.8 5.2 -5 3.4 -5 0.6 V-4 Z"
        fill="#0b6b47"
        opacity="0.55"
      />
    </g>
  );
}

/** A coin seen face-on, for the one moving along the payment path. */
export function CoinFace({ r = 11, tone = TONE.mint }: { r?: number; tone?: string }) {
  return (
    <g>
      <circle r={r + 5} fill={tone} opacity="0.28" filter="url(#art-soft)" />
      <circle r={r} fill="url(#art-coin-edge)" />
      <circle r={r - 1.6} fill="url(#art-coin)" stroke={tone} strokeWidth="0.8" />
      <circle r={r - 4.5} fill="none" stroke="#0b6b47" strokeOpacity="0.4" strokeWidth="0.8" />
      <path
        transform={`scale(${r / 14})`}
        d="M0 -5.5 L5 -3.6 V0.6 C5 3.4 2.8 5.2 0 6.4 C-2.8 5.2 -5 3.4 -5 0.6 V-3.6 Z"
        fill="#0b6b47"
        opacity="0.6"
      />
    </g>
  );
}

/** Stacks of coins: the daily budget, sitting in the vault. Columns drop in one coin at a time. */
export function CoinStackPart({ columns = [4, 6, 3], animate = true }: { columns?: number[]; animate?: boolean }) {
  const span = 34;
  const left = 60 - ((columns.length - 1) * span) / 2;
  let n = 0;
  return (
    <g>
      <ellipse cx="60" cy="102" rx="56" ry="11" fill="url(#art-floor)" />
      {columns.map((count, col) => (
        <g key={col}>
          {Array.from({ length: count }, (_, i) => {
            const delay = n++ * 0.07;
            return (
              <g
                key={i}
                className={animate ? 'art-drop' : undefined}
                style={animate ? { animationDelay: `${delay}s` } : undefined}
              >
                <CoinPart x={left + col * span} y={98 - i * 8} r={16} />
              </g>
            );
          })}
        </g>
      ))}
    </g>
  );
}
