"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { runAssistantCommandAction } from "@/app/(app)/assistant/actions";

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  href?: string;
  label?: string;
}

let nextId = 1;

const QUICK_PROMPTS = ["my tickets", "which tickets are at risk", "how do I add a team member"];

const INTRO_DISMISSED_KEY = "mw_staff_assistant_intro_dismissed";
const INTRO_DELAY_MS = 3_000;
const INTRO_AUTO_HIDE_MS = 8_000;
const SUPPORT_EMAIL = "gm70291691@gmail.com";
const SUPPORT_PHONE = "+254799277412";

/**
 * Staff-facing assistant, available on every authenticated page — helps
 * with navigation questions and can perform real actions (forward/assign/
 * nudge a ticket) by calling the same service functions the normal UI
 * uses, so it's bound by the same RBAC as everything else. Deterministic
 * pattern matching (see lib/assistant/parse-intent.ts), not a live AI
 * model — same honest framing as the customer-facing chatbot.
 */
export function StaffAssistant() {
  const [open, setOpen] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // A one-time, self-dismissing intro so staff learn the assistant exists
  // and what it can do, plus who to reach for platform changes — shown
  // once per browser, same pattern as the customer-facing chatbot's invite
  // bubble (see help-chatbot.tsx).
  useEffect(() => {
    if (localStorage.getItem(INTRO_DISMISSED_KEY)) return;
    const showTimer = setTimeout(() => setShowIntro(true), INTRO_DELAY_MS);
    return () => clearTimeout(showTimer);
  }, []);

  function dismissIntro() {
    setShowIntro(false);
    localStorage.setItem(INTRO_DISMISSED_KEY, "1");
  }

  useEffect(() => {
    if (!showIntro) return;
    const hideTimer = setTimeout(dismissIntro, INTRO_AUTO_HIDE_MS);
    return () => clearTimeout(hideTimer);
  }, [showIntro]);

  function toggleOpen() {
    dismissIntro();
    const next = !open;
    if (next && messages.length === 0) {
      setMessages([{ id: nextId++, from: "bot", text: "Hi! Ask me to do something (\"forward TKT-000123 to Finance\") or how to find a feature." }]);
    }
    setOpen(next);
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  async function handleSend(rawText?: string) {
    const text = (rawText ?? input).trim();
    if (!text || busy) return;
    setMessages((m) => [...m, { id: nextId++, from: "user", text }]);
    setInput("");
    setBusy(true);
    const reply = await runAssistantCommandAction(text);
    setBusy(false);
    setMessages((m) => [...m, { id: nextId++, from: "bot", text: reply.text, href: reply.href, label: reply.label }]);
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Patrick's Assistant"
            className="flex h-[32rem] w-[26rem] max-h-[85vh] max-w-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-primary/5 px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <div>
                  <p className="text-sm font-semibold">Patrick&apos;s Assistant</p>
                  <p className="text-[10px] text-muted-foreground">Rule-based assistant — not a live AI model</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Close assistant">
                <X className="size-4" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                      m.from === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {m.text}
                    {m.href && m.label && (
                      <Link href={m.href} className="mt-1.5 block text-xs font-medium underline underline-offset-2" onClick={() => setOpen(false)}>
                        {m.label} →
                      </Link>
                    )}
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> Working...
                  </div>
                </div>
              )}
            </div>

            {messages.length <= 1 && !busy && (
              <div className="flex flex-wrap gap-1.5 border-t border-border p-2">
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} onClick={() => handleSend(p)} className="rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs text-primary hover:bg-primary/10">
                    {p}
                  </button>
                ))}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSend();
              }}
              className="flex items-center gap-2 border-t border-border p-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
                placeholder="Ask or tell me to do something..."
                autoFocus
                className="flex-1 rounded-md border border-input bg-card px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              />
              <Button type="submit" size="icon" disabled={busy || !input.trim()} aria-label="Send message">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      {showIntro && !open && (
        <div className="fixed bottom-20 right-4 z-40 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card p-3 shadow-lg sm:bottom-24 sm:right-6 sm:max-w-72">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-primary" />
            <div className="space-y-1.5 text-sm">
              <p className="font-medium">Meet Patrick&apos;s Assistant</p>
              <p className="text-xs text-muted-foreground">
                Ask it to find a feature or handle a quick task for you — e.g. &quot;forward TKT-000123 to Finance&quot; or &quot;my tickets&quot;.
              </p>
              <p className="text-xs text-muted-foreground">
                Need a platform change or update? Contact Patrick at{" "}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>{" "}
                or{" "}
                <a href={`tel:${SUPPORT_PHONE}`} className="text-primary hover:underline">
                  {SUPPORT_PHONE}
                </a>
                .
              </p>
            </div>
            <button onClick={dismissIntro} className="shrink-0 rounded-md p-0.5 text-muted-foreground hover:bg-secondary" aria-label="Dismiss">
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
        <Button size="icon" className="size-12 rounded-full shadow-lg" onClick={toggleOpen} aria-label={open ? "Close assistant" : "Open assistant"}>
          {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
        </Button>
      </div>
    </>
  );
}
