"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        className="p-2 -mr-2 text-white/70 hover:text-white transition-colors"
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
        className={`fixed top-0 right-0 bottom-0 z-50 w-72 lg:w-1/3 lg:max-w-sm bg-slate-950 border-l border-white/10 shadow-2xl shadow-black/50 flex flex-col transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
          <p className="font-semibold text-white">Menu</p>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="text-white/60 hover:text-white text-lg leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <DrawerLink href="/profile/edit"  icon="✏️"  label="Edit profile" onSelect={() => setOpen(false)} />
          <DrawerLink href="/echoes/new"    icon="📣"  label="Post an echo"  onSelect={() => setOpen(false)} />
          <DrawerLink href="/activities/new" icon="📍" label="Host a meetup" onSelect={() => setOpen(false)} />
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={signOut}
            className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 font-medium hover:bg-red-500/15 transition-colors"
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
      className="flex items-center gap-3 px-3 py-3 rounded-xl text-white/80 hover:bg-white/5 hover:text-white transition-colors"
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
