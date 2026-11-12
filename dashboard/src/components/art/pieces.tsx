import {
  AttackerPart,
  BotPart,
  CoinStackPart,
  KeyPart,
  OwnerPart,
  VaultPart,
  VendorPart,
  type BotPose,
  type OwnerState,
  type VaultState,
} from './parts';

type FrameProps = { size?: number; className?: string; label?: string };

// Decorative by default: most of these sit next to a heading that already says what they show.
function Frame({ size = 96, className = '', label, children }: FrameProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={`shrink-0 overflow-visible ${className}`}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {children}
    </svg>
  );
}

export const AgentArt = ({ pose, ...p }: FrameProps & { pose?: BotPose }) => (
  <Frame {...p}>
    <BotPart pose={pose} />
  </Frame>
);
export const AttackerArt = ({ beaten, ...p }: FrameProps & { beaten?: boolean }) => (
  <Frame {...p}>
    <AttackerPart beaten={beaten} />
  </Frame>
);
export const VaultArt = ({ state, ...p }: FrameProps & { state?: VaultState }) => (
  <Frame {...p}>
    <VaultPart state={state} />
  </Frame>
);
export const VendorArt = ({ paid, ...p }: FrameProps & { paid?: boolean }) => (
  <Frame {...p}>
    <VendorPart paid={paid} />
  </Frame>
);
export const OwnerArt = ({ state, ...p }: FrameProps & { state?: OwnerState }) => (
  <Frame {...p}>
    <OwnerPart state={state} />
  </Frame>
);
export const KeyArt = (p: FrameProps) => (
  <Frame {...p}>
    <KeyPart />
  </Frame>
);
export const CoinStackArt = ({ columns, animate, ...p }: FrameProps & { columns?: number[]; animate?: boolean }) => (
  <Frame {...p}>
    <CoinStackPart columns={columns} animate={animate} />
  </Frame>
);
