"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteDepartmentAction } from "@/app/(app)/admin/departments/actions";

export function DeleteDepartmentButton({ departmentId, name, userCount }: { departmentId: string; name: string; userCount: number }) {
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
        description={
          userCount > 0
            ? `${userCount} staff member(s) are assigned here. Reassign them before deleting.`
            : "This cannot be undone."
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteDepartmentAction(departmentId);
          if (result.error) setError(result.error);
        }}
      />
      {error && <p className="mt-1 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
