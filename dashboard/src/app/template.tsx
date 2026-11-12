import { ViewTransition } from 'react';

// A template remounts on every navigation, so the old page can fade out as the new one rises in.
// First loads aren't transitions, so nothing here delays the first paint.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      {children}
    </ViewTransition>
  );
}
