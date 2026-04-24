import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ConfirmVerification } from "./confirm";

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/verify/${token}`);

  const { data: log } = await supabase
    .from("verification_logs")
    .select("id, activity_id, initiator_id, status, token_expires_at")
    .eq("qr_token", token)
    .maybeSingle();

  const now = new Date();
  const expired = log ? new Date(log.token_expires_at) < now : true;

  return (
    <main className="min-h-screen bg-gradient-to-br from-violet-950 via-indigo-950 to-slate-950 text-white flex items-center justify-center p-5">
      <div className="w-full max-w-sm text-center">
        {!log ? (
          <Panel emoji="❓" title="Code not found" body="This QR code doesn't match any active meetup." />
        ) : expired ? (
          <Panel emoji="⏱" title="Code expired" body="Ask the host to refresh the QR and scan again." />
        ) : log.status === "verified" ? (
          <Panel emoji="✅" title="Already verified" body="You&rsquo;ve already checked in to this meetup." />
        ) : log.initiator_id === user.id ? (
          <Panel emoji="🙂" title="That&rsquo;s your own code" body="Ask your attendee to scan instead." />
        ) : (
          <ConfirmVerification logId={log.id} activityId={log.activity_id} />
        )}

        <Link href="/home" className="inline-block mt-6 text-sm text-violet-300 hover:text-violet-200">
          ← Back to app
        </Link>
      </div>
    </main>
  );
}

function Panel({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <>
      <div className="text-5xl mb-4">{emoji}</div>
      <h1 className="text-2xl font-semibold mb-2">{title}</h1>
      <p className="text-white/60 text-sm">{body}</p>
    </>
  );
}
