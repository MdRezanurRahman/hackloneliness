"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/onboarding`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 mb-4">
          <span className="text-slate-900 dark:text-white font-bold text-lg">h</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Start your journey</h1>
        <p className="text-slate-900/50 dark:text-white/50 text-sm mt-1">Lyanna can&apos;t wait to meet you</p>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-slate-900/70 dark:text-white/70 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-400/50 focus:bg-slate-50 dark:bg-slate-900 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-slate-900/70 dark:text-white/70 mb-1.5">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder="At least 8 characters"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-400/50 focus:bg-slate-50 dark:bg-slate-900 transition-colors"
          />
        </div>

        <div>
          <label htmlFor="repeat-password" className="block text-sm text-slate-900/70 dark:text-white/70 mb-1.5">
            Confirm password
          </label>
          <input
            id="repeat-password"
            type="password"
            required
            minLength={8}
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-400/50 focus:bg-slate-50 dark:bg-slate-900 transition-colors"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-900/50 dark:text-white/50">
        Already a member?{" "}
        <Link href="/auth/login" className="text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 dark:text-violet-300 font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
