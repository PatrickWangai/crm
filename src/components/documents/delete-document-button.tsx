"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * `deleteAction` must be a bound Server Action reference (e.g.
 * `deleteDocumentAction.bind(null, documentId, ownerId)`), not an inline
 * closure — Next.js can only serialize actual Server Action references
 * across the Server → Client Component boundary.
 */
export function DeleteDocumentButton({ fileName, deleteAction }: { fileName: string; deleteAction: () => Promise<{ error?: string }> }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
        title={`Delete "${fileName}"?`}
        description="This will permanently remove the file. This cannot be undone."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteAction();
          if (result.error) setError(result.error);
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
