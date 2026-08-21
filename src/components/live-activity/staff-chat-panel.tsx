"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LiveChatMessage } from "@/lib/validation/public-support";

const POLL_MS = 8_000;

/** Staff-side of the live chat opened from a Live Activity row — mirrors LiveChatThread's customer-side layout, but authenticated via the normal staff session instead of a (ticketNumber, email) pair. */
export function StaffChatPanel({
  ticketId,
  ticketNumber,
  onClose,
  fetchThread,
  sendMessage,
}: {
  ticketId: string;
  ticketNumber: string;
  onClose: () => void;
  fetchThread: (ticketId: string) => Promise<LiveChatMessage[]>;
  sendMessage: (ticketId: string, content: string) => Promise<LiveChatMessage>;
}) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const result = await fetchThread(ticketId).catch(() => null);
      if (!cancelled && result) setMessages(result);
    }
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [fetchThread, ticketId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    const message = await sendMessage(ticketId, content).catch(() => null);
    setSending(false);
    if (message) {
      setInput("");
      setMessages((prev) => [...prev, message]);
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">Chat — {ticketNumber}</CardTitle>
        <button onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-secondary" aria-label="Close chat">
          <X className="size-4" />
        </button>
      </CardHeader>
      <CardContent className="space-y-2">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div ref={listRef} className="max-h-64 space-y-2 overflow-y-auto rounded-md bg-secondary/30 p-2.5">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.from === "staff" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-1.5 text-sm ${m.from === "staff" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  {m.content}
                  <p className={`mt-0.5 text-[10px] ${m.from === "staff" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(m.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Reply to the customer..."
            disabled={sending}
            className="flex-1 rounded-md border border-input bg-card px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Send message">
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
