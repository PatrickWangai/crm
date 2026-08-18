"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TicketCommentForm } from "@/components/tickets/ticket-comment-form";

export function TicketCommentSection({ ticketId, suggestedReply }: { ticketId: string; suggestedReply: string | null }) {
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [formKey, setFormKey] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  return (
    <div className="space-y-3">
      {suggestedReply && !dismissed && (
        <div className="rounded-md border border-primary/30 bg-primary/[0.03] p-3 text-xs">
          <p className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
            <Sparkles className="size-3.5 text-primary" /> AI Suggested Reply
          </p>
          <p className="whitespace-pre-wrap text-muted-foreground">{suggestedReply}</p>
          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(suggestedReply);
                setFormKey((k) => k + 1);
                setDismissed(true);
              }}
            >
              Use this reply
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDismissed(true)}>
              Dismiss
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            Rule-based mock suggestion — the AI Assistant integration is not connected to a live model in this environment.
          </p>
        </div>
      )}
      <TicketCommentForm key={formKey} ticketId={ticketId} initialValue={draft} />
    </div>
  );
}
