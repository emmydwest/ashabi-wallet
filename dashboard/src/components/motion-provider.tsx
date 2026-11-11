'use client';

import { MotionConfig } from 'motion/react';
import type { ReactNode } from 'react';

// Anyone who asks their OS for less motion gets fades instead of slides and floats.
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
