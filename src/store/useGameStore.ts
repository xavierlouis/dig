// src/store/useGameStore.ts
'use client';

import { create } from 'zustand';
import type { LevelSession, DeadToken, TombReveal } from '@/services/types';

type GamePhase = 'graveyard' | 'level' | 'summary';

interface GameState {
  // Wallet
  walletConnected: boolean;
  walletAddress: string | null;
  balance: number; // SOL

  // Digs
  digBalance: number;

  // Level
  activeSession: LevelSession | null;
  gamePhase: GamePhase;

  // Today's token
  todaysToken: DeadToken | null;

  // Economy
  jackpotBalance: number;
  buyPressureToday: number;

  // Sound
  soundEnabled: boolean;

  // Actions
  connectWallet: (address: string, balance: number) => void;
  disconnectWallet: () => void;
  setBalance: (balance: number) => void;
  deductBalance: (amount: number) => void;
  addBalance: (amount: number) => void;
  setDigBalance: (balance: number) => void;
  decrementDigBalance: () => void;
  setActiveSession: (session: LevelSession | null) => void;
  updateTombReveal: (tombIndex: number, reveal: TombReveal) => void;
  updateTombChoice: (tombIndex: number, choice: 'sol' | 'token', actualPayout: number) => void;
  setGamePhase: (phase: GamePhase) => void;
  setTodaysToken: (token: DeadToken) => void;
  setJackpotBalance: (amount: number) => void;
  setBuyPressureToday: (amount: number) => void;
  toggleSound: () => void;
  reset: () => void;
}

const initialState = {
  walletConnected: false,
  walletAddress: null,
  balance: 0,
  digBalance: 0,
  activeSession: null,
  gamePhase: 'graveyard' as GamePhase,
  todaysToken: null,
  jackpotBalance: 1.0, // seeded at 1 SOL
  buyPressureToday: 0,
  soundEnabled: true,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  connectWallet: (address, balance) =>
    set({ walletConnected: true, walletAddress: address, balance }),

  disconnectWallet: () =>
    set({ walletConnected: false, walletAddress: null, balance: 0, digBalance: 0 }),

  setBalance: (balance) => set({ balance }),

  deductBalance: (amount) =>
    set((s) => ({ balance: Math.max(0, s.balance - amount) })),

  addBalance: (amount) =>
    set((s) => ({ balance: s.balance + amount })),

  setDigBalance: (digBalance) => set({ digBalance }),

  decrementDigBalance: () =>
    set((s) => ({ digBalance: Math.max(0, s.digBalance - 1) })),

  setActiveSession: (session) => set({ activeSession: session }),

  updateTombReveal: (tombIndex, reveal) =>
    set((s) => {
      if (!s.activeSession) return {};
      const tombs = s.activeSession.tombs.map((t) =>
        t.index === tombIndex ? { ...t, status: 'opened' as const, reveal } : t,
      );
      return { activeSession: { ...s.activeSession, tombs } };
    }),

  updateTombChoice: (tombIndex, choice, actualPayout) =>
    set((s) => {
      if (!s.activeSession) return {};
      const tombs = s.activeSession.tombs.map((t) => {
        if (t.index !== tombIndex || !t.reveal) return t;
        return { ...t, reveal: { ...t.reveal, choice, actualPayout } };
      });
      return { activeSession: { ...s.activeSession, tombs } };
    }),

  setGamePhase: (phase) => set({ gamePhase: phase }),

  setTodaysToken: (token) => set({ todaysToken: token }),

  setJackpotBalance: (amount) => set({ jackpotBalance: amount }),

  setBuyPressureToday: (amount) => set({ buyPressureToday: amount }),

  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

  reset: () => set(initialState),
}));
