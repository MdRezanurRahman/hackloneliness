export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white sm:flex sm:items-center sm:justify-center sm:p-4">
      {children}
    </div>
  );
}
