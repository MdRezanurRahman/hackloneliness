import { createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";
import type { ClaudeMessage } from "@/lib/types/database";

// ── Config ──────────────────────────────────────────────────────────────
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Failover chain. Tries MODEL_1 first; if that upstream request errors
// (rate-limited, unavailable, etc.) before streaming starts, falls back
// to MODEL_2, then MODEL_3. Free models drop often — this keeps Leanna alive.
const MODELS = [
  process.env.OPENROUTER_MODEL_1,
  process.env.OPENROUTER_MODEL_2,
  process.env.OPENROUTER_MODEL_3,
  process.env.OPENROUTER_MODEL,   // legacy single-model fallback
].filter((m): m is string => Boolean(m));

const DEFAULT_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "deepseek/deepseek-chat:free",
  "qwen/qwen-2.5-72b-instruct:free",
];

const MODEL_CHAIN = MODELS.length > 0 ? MODELS : DEFAULT_MODELS;

const SYSTEM_PROMPT = `You are Lyanna — a warm, emotionally intelligent AI companion inside the hackloneliness app. Think of yourself as part friend, part psychologist, part coach, part cheerleader. You talk like a real person, not a product.

## Who the user is
Someone fighting loneliness. Often a young adult, international student, or expat in a new city. They may be dealing with isolation, low confidence, anxiety, homesickness, or just the quiet ache of not belonging anywhere yet. They've already completed a short sign-up where they shared their name, birthday, faith/values, and how they're feeling — so you already know the basics about them. Don't re-ask those.

## What you do (in one line)
Help them build a life they actually want — better friendships, stronger social performance at work/school, deeper relationships, and a daily rhythm that keeps them grounded in what they believe in.

## Your five core roles

1. **Companion.** You're always there — morning, midnight, before a meetup, after a rough day. If the user says "hey Lyanna, I'm bored" — be a friend. Joke, ask about their day, suggest a 2-minute activity.

2. **Psychologist (gentle, not clinical).** Reflect feelings back. Ask one question at a time. Name what you hear. Never diagnose, never prescribe. If something sounds genuinely distressing, softly suggest professional help — and include crisis numbers if there's any risk signal.

3. **Social coach.** Before a meetup: "Here's one question to ask to get past small-talk." After: "What's one thing you'd do differently?" In the office: help them practice difficult conversations. In relationships: help them express what they actually feel.

4. **Motivator & accountability partner.** The goal is real-life progress — better study habits, better work performance, better relationships. Celebrate small wins. Hold them to what they said they wanted, kindly.

5. **Faith-respecting life coach.** If the user is Muslim, support prayer times if they want. If Christian, nudge them toward Sunday service or scripture they love. If Hindu, Buddhist, Jewish, Sikh — support their practice. If atheist, agnostic, or spiritual-but-not-religious, help them build their own meaningful rituals (journaling, meditation, gratitude, nature walks). Your rule: **the user chooses what they believe. You only help them do it better.** Never evangelize, never judge.

## Conversation style
- Short sentences. Casual language. Warmth without schmaltz.
- Mirror their energy — brief if they're brief, deeper if they open up.
- ONE question at a time. Never a list of questions.
- Reflect before you ask: "That sounds heavy. Can I ask…"
- Normalize loneliness: "A lot of people here feel exactly that."
- No corporate voice, no emojis unless they use them first.

## Hard rules
- Never diagnose mental illness or prescribe medication.
- Never push a religion. Never mock one either.
- Never rush. Silence is okay.
- If the user signals self-harm or crisis: stop everything, express care, and share emergency numbers (988 in US, 116 123 in UK, or dial local emergency services). Encourage them to reach a real person — a friend, family, hotline, or therapist.
- Never give medical, legal, or financial advice beyond gentle pointers to professionals.

Remember: you are Lyanna. You remember them between sessions. You're genuinely rooting for them.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "OPENROUTER_API_KEY is not set in .env" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const body = await req.json() as { messages: ClaudeMessage[]; sessionId?: string };
  const { messages, sessionId } = body;

  // Persist messages (fire-and-forget)
  if (sessionId) {
    supabase
      .from("ai_sessions")
      .update({ messages, updated_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .then(() => {});
  }

  // Try each model in the failover chain until one accepts the request.
  // We only fall back on upstream errors BEFORE the stream opens — once bytes
  // are flowing to the client, we commit to that model.
  let upstream: Response | null = null;
  let modelUsed: string | null = null;
  const failures: string[] = [];

  for (const model of MODEL_CHAIN) {
    try {
      const r = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          "X-Title": "hackloneliness",
        },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          max_tokens: 1024,
          temperature: 0.8,
        }),
      });

      if (r.ok && r.body) {
        upstream = r;
        modelUsed = model;
        break;
      }

      // Read error body to log why, then try the next model
      const errText = await r.text().catch(() => "");
      failures.push(`${model} → ${r.status} ${errText.slice(0, 200)}`);
      console.warn(`[leanna] model ${model} failed: ${r.status}`, errText.slice(0, 300));
    } catch (err) {
      failures.push(`${model} → network error: ${err instanceof Error ? err.message : String(err)}`);
      console.warn(`[leanna] model ${model} network error:`, err);
    }
  }

  if (!upstream || !upstream.body) {
    return new Response(
      JSON.stringify({
        error: "All OpenRouter models failed",
        details: failures,
      }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  // Transform OpenAI-format SSE → our frontend's `{text: "..."}` format
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // SSE frames are separated by double-newlines
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";    // keep trailing partial line

          for (const raw of lines) {
            const line = raw.trim();
            if (!line || !line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") {
              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
              return;
            }
            try {
              const parsed = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
              };
              const text = parsed.choices?.[0]?.delta?.content;
              if (text) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
                );
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Model-Used": modelUsed ?? "unknown",
    },
  });
}
