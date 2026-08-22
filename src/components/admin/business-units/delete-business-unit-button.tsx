"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteBusinessUnitAction } from "@/app/(app)/admin/business-units/actions";

export function DeleteBusinessUnitButton({
  businessUnitId,
  name,
  userCount,
  departmentCount,
}: {
  businessUnitId: string;
  name: string;
  userCount: number;
  departmentCount: number;
}) {
  const [error, setError] = useState<string | null>(null);
  const blocked = userCount > 0 || departmentCount > 0;

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
          blocked
            ? `Still has ${userCount} staff member(s) and ${departmentCount} department(s) attached — reassign or remove those first.`
            : "Removes it from every customer-facing picker immediately. This cannot be undone."
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteBusinessUnitAction(businessUnitId);
          if (result.error) setError(result.error);
        }}
      />
      {error && <p className="mt-1 text-right text-xs text-destructive">{error}</p>}
    </div>
  );
}
