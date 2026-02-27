// src/components/ui/WalletButton.tsx
'use client';

import dynamic from 'next/dynamic';

const USE_BLOCKCHAIN = process.env.NEXT_PUBLIC_USE_BLOCKCHAIN === 'true';

// Lazy-load to avoid pulling adapter code into mock builds
const WalletButtonBlockchain = dynamic(
  () => import('./WalletButtonBlockchain'),
  { ssr: false },
);
const WalletButtonMock = dynamic(
  () => import('./WalletButtonMock'),
  { ssr: false },
);

export default function WalletButton() {
  if (USE_BLOCKCHAIN) {
    return <WalletButtonBlockchain />;
  }
  return <WalletButtonMock />;
}
