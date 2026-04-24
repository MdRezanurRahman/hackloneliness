export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 sm:flex sm:items-center sm:justify-center sm:p-4">
      {children}
    </div>
  );
}
