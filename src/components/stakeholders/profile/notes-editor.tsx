"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateNotesAction } from "@/app/(app)/stakeholders/actions";

export function NotesEditor({ stakeholderId, initialNotes, readOnly }: { stakeholderId: string; initialNotes: string; readOnly: boolean }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(true);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        disabled={readOnly}
        onChange={(e) => {
          setNotes(e.target.value);
          setSaved(false);
        }}
        rows={10}
        placeholder="Internal notes about this stakeholder — context, preferences, history that doesn't fit elsewhere..."
        className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      />
      {!readOnly && (
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            loading={isPending}
            disabled={saved}
            onClick={() =>
              startTransition(async () => {
                await updateNotesAction(stakeholderId, notes);
                setSaved(true);
              })
            }
          >
            <Save className="size-3.5" /> Save notes
          </Button>
          {saved && <span className="text-xs text-muted-foreground">Saved</span>}
        </div>
      )}
    </div>
  );
}
