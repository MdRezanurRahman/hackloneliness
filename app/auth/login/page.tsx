import { LoginForm } from "@/components/login-form";

export default function Page() {
  return (
    <div className="min-h-svh w-full bg-white dark:bg-black dark:bg-black flex items-center justify-center p-5 sm:p-8">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
