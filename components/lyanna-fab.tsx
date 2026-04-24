"use client";

import { useEffect, useState } from "react";
import { LyannaChat } from "./lyanna-chat";

export function LyannaFab() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 sm:bottom-8 sm:right-8 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 shadow-2xl shadow-violet-500/50 hover:scale-105 active:scale-95 transition-transform flex items-center justify-center group"
        aria-label="Talk to Lyanna"
      >
        {/* Pulsing ring */}
        <span className="absolute inset-0 rounded-full bg-violet-400/50 animate-ping opacity-40" />
        <span className="relative text-white font-bold text-xl">L</span>
        {/* Live dot */}
        <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-950" />
      </button>

      {open && <LyannaChat asModal onClose={() => setOpen(false)} />}
    </>
  );
}
