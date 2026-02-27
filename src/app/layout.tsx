// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import AppProviders from "@/components/providers/AppProviders";
import SoundSync from "@/components/ui/SoundSync";

export const metadata: Metadata = {
  title: "DIG",
  description: "Daily tomb-raiding game on Solana's token graveyard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Pirata+One&family=Cinzel:wght@700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProviders>
          <SoundSync />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}