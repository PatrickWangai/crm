"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteRoleAction } from "@/app/(app)/admin/roles/actions";

export function DeleteRoleButton({ roleId, name, userCount }: { roleId: string; name: string; userCount: number }) {
  const [error, setError] = useState<string | null>(null);

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <ConfirmDialog
        trigger={
          <Button variant="ghost" size="icon">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
        title={`Delete "${name}"?`}
        description={userCount > 0 ? `${userCount} user(s) currently hold this role. Reassign them first.` : "This cannot be undone."}
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteRoleAction(roleId);
          if (result.error) setError(result.error);
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
