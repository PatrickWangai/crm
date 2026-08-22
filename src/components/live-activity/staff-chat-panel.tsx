"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateTicketFromVisitorForm } from "@/components/live-activity/create-ticket-from-visitor-form";
import type { LiveChatMessage } from "@/lib/validation/public-support";
import type { CreateTicketFromVisitorInput } from "@/lib/services/live-chat.service";

const POLL_MS = 8_000;

/**
 * Staff-side of a live chat opened from a Live Activity row — a popup
 * (not an inline panel, so it doesn't push the rest of the page down and
 * require scrolling to find it), with two modes: an existing ticket's
 * thread (title carries the ticket number, no "Create Ticket" section) or
 * a not-yet-ticketed visitor's thread (title says "Visitor", a "Create
 * Ticket" section is offered). The caller (live-activity-view.tsx) binds
 * fetchThread/sendMessage to whichever backing (ticketId or sessionId) is
 * relevant — this component doesn't know or care which. Always mounted
 * "open" — the caller only renders it at all when there's a target to
 * chat with, and unmounts it on close.
 */
export function StaffChatPanel({
  title,
  onClose,
  fetchThread,
  sendMessage,
  createTicket,
}: {
  title: string;
  onClose: () => void;
  fetchThread: () => Promise<LiveChatMessage[]>;
  sendMessage: (content: string) => Promise<LiveChatMessage>;
  createTicket?: (input: CreateTicketFromVisitorInput) => Promise<{ error?: string; ticketNumber?: string }>;
}) {
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showCreateTicket, setShowCreateTicket] = useState(false);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const result = await fetchThread().catch(() => null);
      if (!cancelled && result) setMessages(result);
    }
    void tick();
    const id = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchThread is a fresh closure each render by design (binds the current ticketId/sessionId); re-running the interval setup on every render would restart polling constantly
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    const message = await sendMessage(content).catch(() => null);
    setSending(false);
    if (message) {
      setInput("");
      setMessages((prev) => [...prev, message]);
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Chat — {title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 space-y-2 overflow-y-auto">
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
              autoFocus
              className="flex-1 rounded-md border border-input bg-card px-3 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            />
            <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Send message">
              {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </Button>
          </form>

          {createTicket && !createdTicketNumber && (
            <div className="border-t border-border pt-2">
              {!showCreateTicket ? (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowCreateTicket(true)}>
                  <TicketIcon className="size-3.5" /> Create ticket from this conversation
                </Button>
              ) : (
                <CreateTicketFromVisitorForm
                  onSubmit={createTicket}
                  onCancel={() => setShowCreateTicket(false)}
                  onCreated={(ticketNumber) => setCreatedTicketNumber(ticketNumber)}
                />
              )}
            </div>
          )}
          {createdTicketNumber && <p className="border-t border-border pt-2 text-sm text-success">Created {createdTicketNumber} — this conversation now lives on that ticket.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
