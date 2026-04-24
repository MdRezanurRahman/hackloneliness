import Link from "next/link";

export default function Page() {
  return (
    <div className="min-h-svh w-full bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex items-center justify-center p-5 sm:p-8">
      <div className="w-full max-w-sm text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-indigo-500 mb-5 shadow-xl shadow-violet-500/30">
          <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-white" stroke="currentColor" strokeWidth={2.5}>
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">You&apos;re in!</h1>
        <p className="text-white/60 text-sm mb-6 leading-relaxed">
          Check your inbox to confirm your email. Once you do, Lyanna will be waiting.
        </p>
        <Link
          href="/auth/login"
          className="inline-block w-full py-3 rounded-xl bg-white text-slate-900 font-semibold hover:bg-white/90 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
