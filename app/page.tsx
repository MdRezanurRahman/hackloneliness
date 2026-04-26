import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-900 relative overflow-hidden">
      {/* Decorative glow */}
      <div
        aria-hidden
        className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-500/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/20 blur-[120px]"
      />

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Nav */}
        <nav className="px-5 py-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">
              h
            </div>
            <span className="font-semibold tracking-tight">hackloneliness</span>
          </div>
          <Link
            href="/auth/login"
            className="text-sm text-slate-900/60 hover:text-slate-900 transition-colors"
          >
            Sign in
          </Link>
        </nav>

        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-5 pb-12 pt-8 sm:pt-16 text-center">
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            <span className="text-slate-900/70 text-xs sm:text-sm">Meet Lyanna — your AI companion</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-5 max-w-3xl leading-[1.05]">
            Loneliness isn&apos;t
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
              your story anymore.
            </span>
          </h1>

          <p className="text-slate-900/60 text-base sm:text-lg max-w-md sm:max-w-xl mb-8 leading-relaxed">
            Real people. Real meetups. A companion that gets you.
            Lyanna learns who you are, then helps you build the life you actually want.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm sm:max-w-md sm:w-auto">
            <Link
              href="/auth/sign-up"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold hover:opacity-90 transition-opacity text-center"
            >
              Get started — it&apos;s free
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-slate-100 border border-slate-200 font-semibold hover:bg-slate-200 transition-colors text-center"
            >
              I have an account
            </Link>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-14 w-full max-w-4xl">
            <FeatureCard
              icon="🎯"
              title="Real meetups, nearby"
              body="Coffee, walks, study partners — find someone within 5km in the next 2 hours."
            />
            <FeatureCard
              icon="🤝"
              title="Verified & safe"
              body="QR-handshake check-ins and peer reviews keep the community real."
            />
            <FeatureCard
              icon="✨"
              title="Lyanna, always with you"
              body="Talk like a friend. Get motivated. Stay grounded in what matters to you."
            />
          </div>
        </div>

        <footer className="px-5 py-6 text-center text-slate-900/30 text-xs">
          Built with care. You belong here.
        </footer>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left backdrop-blur-sm hover:bg-slate-100 transition-colors">
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className="font-semibold text-sm mb-1.5">{title}</h3>
      <p className="text-slate-900/50 text-xs leading-relaxed">{body}</p>
    </div>
  );
}
