"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEMO_EMAIL = "demo@hackloneliness.app";
const DEMO_PASSWORD = "Demo1234!";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const router = useRouter();

  const signIn = async (e: string, p: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
    if (error) throw error;
    router.push("/onboarding");
  };

  const handleLogin = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemo = async () => {
    setIsDemoLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      // 1. Try direct sign-in — works if demo account already exists & is confirmed
      const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });
      if (!signInErr && signInData.session) {
        router.push("/onboarding");
        return;
      }

      // 2. Sign-in failed — try to create the account
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      });

      // Already-registered OR invalid-credentials both mean the account exists
      // but the password we have is wrong, or email needs confirmation.
      if (signUpErr) {
        if (/already/i.test(signUpErr.message)) {
          setError(
            "Demo account already exists but the password didn't match. Open Supabase → Authentication → Users, delete demo@hackloneliness.app, then click this button again.",
          );
          return;
        }
        throw signUpErr;
      }

      // 3. signUp succeeded. If session came back, we're logged in.
      if (signUpData.session) {
        router.push("/onboarding");
        return;
      }

      // 4. No session returned → Supabase is requiring email confirmation.
      setError(
        "Demo account created, but Supabase is asking for email confirmation. Go to Supabase → Authentication → Sign In / Providers → Email → toggle 'Confirm email' OFF, then click this button again.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign-in failed");
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      <div className="mb-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 mb-4">
          <span className="text-slate-900 font-bold text-lg">h</span>
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
        <p className="text-slate-900/50 text-sm mt-1">Lyanna is waiting for you</p>
      </div>

      {/* Demo button — top of form for easy access */}
      <button
        type="button"
        onClick={handleDemo}
        disabled={isDemoLoading || isLoading}
        className="w-full py-3 mb-4 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDemoLoading ? "Loading demo…" : "✨ Try demo account"}
      </button>

      <div className="flex items-center gap-3 my-4">
        <div className="h-px bg-slate-100 flex-1" />
        <span className="text-slate-900/30 text-xs">or sign in</span>
        <div className="h-px bg-slate-100 flex-1" />
      </div>

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-slate-900/70 mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-400/50 focus:bg-slate-50 transition-colors"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm text-slate-900/70">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs text-violet-600 hover:text-violet-700"
            >
              Forgot?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-400/50 focus:bg-slate-50 transition-colors"
          />
        </div>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || isDemoLoading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-900/50">
        New here?{" "}
        <Link href="/auth/sign-up" className="text-violet-600 hover:text-violet-700 font-medium">
          Create an account
        </Link>
      </p>

      <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900/50">
        <p className="font-medium text-slate-900/70 mb-1">Demo credentials</p>
        <p>Email: <span className="text-slate-900/80">{DEMO_EMAIL}</span></p>
        <p>Password: <span className="text-slate-900/80">{DEMO_PASSWORD}</span></p>
      </div>
    </div>
  );
}
