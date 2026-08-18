"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteWorkflowAction } from "@/app/(app)/admin/workflows/actions";

export function DeleteWorkflowButton({ workflowId, name }: { workflowId: string; name: string }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
        title={`Delete "${name}"?`}
        description="This cannot be undone. Its trigger reverts to enabled-by-default behavior."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteWorkflowAction(workflowId);
          if (result.error) setError(result.error);
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
