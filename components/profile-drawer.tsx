"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ThemeToggle } from "./theme-toggle";

/**
 * Right-side slide-in drawer triggered by a top-right menu icon.
 * Only renders for the owner of the profile (no menu for visitors).
 */
export function ProfileDrawer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Lock body scroll while drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const signOut = async () => {
    const ok = confirm("Sign out of hackloneliness?");
    if (!ok) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <>
      {/* Trigger — sits in the page header at the top-right */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="p-2 -mr-2 text-slate-900/70 dark:text-white/70 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <MenuIcon />
      </button>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Profile menu"
        aria-modal="true"
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 lg:w-1/3 lg:max-w-sm bg-white dark:bg-black border-l border-slate-200 dark:border-slate-800 shadow-2xl shadow-black/50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <p className="font-semibold text-slate-900 dark:text-white">Menu</p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="text-slate-900/60 dark:text-white/60 hover:text-slate-900 dark:hover:text-white text-lg leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Top: navigation links */}
        <nav className="px-3 py-4 space-y-1">
          <DrawerLink href="/profile/edit"   icon="✏️"  label="Edit profile"   onSelect={() => setOpen(false)} />
          <DrawerLink href="/echoes/new"     icon="📣"  label="Post an echo"   onSelect={() => setOpen(false)} />
          <DrawerLink href="/activities/new" icon="📍"  label="Host a meetup"  onSelect={() => setOpen(false)} />
        </nav>

        {/* Middle: theme toggle (separate panel so it visually breaks
            from the navigation links above) */}
        <div className="px-3 pb-4 border-t border-slate-100 dark:border-slate-900 pt-3">
          <p className="px-3 mb-1 text-[10px] uppercase tracking-wide text-slate-900/40 dark:text-white/40 font-semibold">
            Appearance
          </p>
          <ThemeToggle />
        </div>

        {/* Spacer pushes Sign out to the bottom */}
        <div className="flex-1" />

        {/* Bottom: sign out */}
        <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={signOut}
            className="w-full py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function DrawerLink({
  href,
  icon,
  label,
  onSelect,
}: {
  href: string;
  icon: string;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onSelect}
      className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-900/80 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
    >
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth={1.8}>
      <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
    </svg>
  );
}
