export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-black dark:bg-black sm:flex sm:items-center sm:justify-center sm:p-4">
      {children}
    </div>
  );
}
