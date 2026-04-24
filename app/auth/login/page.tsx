import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-svh w-full bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 flex items-center justify-center p-5 sm:p-8">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
