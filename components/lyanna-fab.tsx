"use client";

import { useEffect, useRef, useState } from "react";
import { LyannaChat } from "./lyanna-chat";

// ── Tunables ─────────────────────────────────────────────────────────
const STORAGE_KEY      = "lyanna-fab-pos";       // remembers user's drag-to position
const FAB_SIZE_PX      = 56;                     // matches w-14 h-14 on mobile (sm: bumps via Tailwind only — clamp to mobile size to be safe)
const EDGE_PADDING_PX  = 12;
const BOTTOM_NAV_PX    = 80;                     // approx height of the bottom-nav so we don't park on top of it
const DRAG_THRESHOLD   = 5;                      // px movement before a press becomes a drag (vs a tap)
const IDLE_FADE_MS     = 2200;                   // become semi-transparent after this long with no interaction

interface Pos { x: number; y: number; }

export function LyannaFab() {
  const [open, setOpen]             = useState(false);
  const [pos, setPos]               = useState<Pos | null>(null);
  const [isFaded, setIsFaded]       = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const buttonRef = useRef<HTMLButtonElement>(null);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragStart = useRef<{ pointerX: number; pointerY: number; px: number; py: number } | null>(null);
  const movedDuringDrag = useRef(false);

  // ── Initial position: load from storage or default to bottom-right ──
  useEffect(() => {
    if (typeof window === "undefined") return;
    let next: Pos | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) next = JSON.parse(raw) as Pos;
    } catch { /* ignore parse errors */ }
    if (!next) next = defaultPosition();
    setPos(clamp(next));
  }, []);

  // ── Re-clamp on window resize / rotation so the FAB never goes off-screen ──
  useEffect(() => {
    const onResize = () => setPos((p) => (p ? clamp(p) : null));
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // ── Body-scroll lock while modal open ──
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // ── Idle fade: any interaction wakes the button; after IDLE_FADE_MS it fades again ──
  const wake = () => {
    setIsFaded(false);
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => setIsFaded(true), IDLE_FADE_MS);
  };

  useEffect(() => {
    wake();   // start the fade timer on mount
    return () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Drag handlers (Pointer events: unified for mouse + touch) ──
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || pos === null) return;
    buttonRef.current.setPointerCapture(e.pointerId);
    dragStart.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      px: pos.x,
      py: pos.y,
    };
    movedDuringDrag.current = false;
    wake();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.pointerX;
    const dy = e.clientY - dragStart.current.pointerY;

    if (!movedDuringDrag.current && (dx * dx + dy * dy) > DRAG_THRESHOLD * DRAG_THRESHOLD) {
      movedDuringDrag.current = true;
      setIsDragging(true);
    }

    if (movedDuringDrag.current) {
      setPos(clamp({
        x: dragStart.current.px + dx,
        y: dragStart.current.py + dy,
      }));
      wake();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (buttonRef.current?.hasPointerCapture(e.pointerId)) {
      buttonRef.current.releasePointerCapture(e.pointerId);
    }
    if (!movedDuringDrag.current) {
      // Tap (no drag) → open the chat
      setOpen(true);
    } else if (pos) {
      // Drag → persist new position
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch { /* quota / private mode */ }
    }
    dragStart.current = null;
    setIsDragging(false);
  };

  const onPointerCancel = () => {
    dragStart.current = null;
    setIsDragging(false);
  };

  // ── Render ────────────────────────────────────────────────────────
  // Don't render until we know where to place it (avoids a flash at top-left).
  if (pos === null) return null;

  // Opacity policy:
  //   - while dragging: full
  //   - while modal open: hidden (the chat covers it; no need to show)
  //   - faded (idle):     45% so content underneath is readable
  //   - awake:            100%
  const opacity =
    open
      ? "opacity-0 pointer-events-none"
      : isDragging
      ? "opacity-100 scale-110"
      : isFaded
      ? "opacity-40 hover:opacity-100"
      : "opacity-100";

  return (
    <>
      <button
        ref={buttonRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onMouseEnter={wake}
        style={{
          left: pos.x,
          top: pos.y,
          touchAction: "none",   // prevents iOS from scrolling while dragging
        }}
        className={`fixed z-40 w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 shadow-2xl shadow-violet-500/40 flex items-center justify-center select-none transition-[opacity,transform] duration-200 ${opacity} ${
          isDragging ? "cursor-grabbing" : "cursor-grab active:scale-95"
        }`}
        aria-label="Talk to Lyanna (drag to move, tap to open)"
      >
        {/* Pulsing ring — only when awake AND not dragging, to keep things calm */}
        {!isFaded && !isDragging && (
          <span className="absolute inset-0 rounded-full bg-violet-400/50 animate-ping opacity-40" aria-hidden />
        )}
        <span className="relative text-slate-900 font-bold text-xl pointer-events-none">L</span>
        <span className="absolute bottom-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white pointer-events-none" />
      </button>

      {open && <LyannaChat asModal onClose={() => setOpen(false)} />}
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function defaultPosition(): Pos {
  if (typeof window === "undefined") return { x: 0, y: 0 };
  return {
    x: window.innerWidth  - FAB_SIZE_PX - EDGE_PADDING_PX,
    y: window.innerHeight - FAB_SIZE_PX - EDGE_PADDING_PX - BOTTOM_NAV_PX,
  };
}

function clamp(p: Pos): Pos {
  if (typeof window === "undefined") return p;
  const maxX = window.innerWidth  - FAB_SIZE_PX - EDGE_PADDING_PX;
  // Allow slightly closer to the bottom; user controls placement after first drag.
  const maxY = window.innerHeight - FAB_SIZE_PX - EDGE_PADDING_PX;
  return {
    x: Math.max(EDGE_PADDING_PX, Math.min(p.x, maxX)),
    y: Math.max(EDGE_PADDING_PX, Math.min(p.y, maxY)),
  };
}
