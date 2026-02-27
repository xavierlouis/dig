// src/components/providers/AppProviders.tsx
'use client';

import dynamic from 'next/dynamic';

const USE_BLOCKCHAIN = process.env.NEXT_PUBLIC_USE_BLOCKCHAIN === 'true';

// Lazy-load SolanaProvider so adapter code isn't bundled in mock mode
const SolanaProvider = dynamic(
  () => import('./SolanaProvider'),
  { ssr: false },
);

export default function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!USE_BLOCKCHAIN) {
    return <>{children}</>;
  }

  return <SolanaProvider>{children}</SolanaProvider>;
}
