// src/components/ui/Header.tsx
'use client';

import WalletButton from './WalletButton';
import SoundToggle from './SoundToggle';
import CreditPill from './CreditPill';

export default function Header() {
  return (
    <header className="flex items-center justify-between gap-3 pt-2">
      {/* Left: Logo */}
      <img
        src="/logo/dig-logo.png"
        srcSet="/logo/dig-logo.png 1x, /logo/dig-logo-2x.png 2x"
        alt="DIG"
        className="w-[160px] h-auto"
      />

      {/* Center: Credit */}
      <CreditPill />

      {/* Right: Sound + Wallet */}
      <div className="flex items-center gap-2">
        <SoundToggle />
        <WalletButton />
      </div>
    </header>
  );
}
