// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import AppProviders from "@/components/providers/AppProviders";
import SoundSync from "@/components/ui/SoundSync";
import GameSync from "@/components/GameSync";
import GameModals from "@/components/ui/GameModals";
import SolToast from "@/components/ui/SolToast";

export const metadata: Metadata = {
  title: "DIG",
  description: "Daily tomb-raiding game on Solana's token graveyard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Pirata+One&family=Cinzel:wght@400;600;700;900&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProviders>
          <SoundSync />
          <GameSync />
          {children}
          <GameModals />
          <SolToast />
        </AppProviders>
      </body>
    </html>
  );
}