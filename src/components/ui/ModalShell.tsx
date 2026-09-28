// src/components/ui/ModalShell.tsx
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';

interface ModalShellProps {
  title: string;
  onClose: () => void;
  closable?: boolean; // false while a transaction is pending
  children: React.ReactNode;
}

export default function ModalShell({ title, onClose, closable = true, children }: ModalShellProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, closable]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => closable && onClose()}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-[420px] rounded-xl2 border border-muted/20 bg-gradient-to-b from-[#1A1A3E]/95 to-[#0A0A1A]/95 p-7 shadow-panel"
      >
        {closable && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 text-[18px] leading-none text-muted/40 transition hover:text-ink"
          >
            ×
          </button>
        )}
        <h2 className="text-center font-gothic text-[26px] tracking-[0.08em] text-ink">{title}</h2>
        {children}
      </motion.div>
    </div>
  );
}
