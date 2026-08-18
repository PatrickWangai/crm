"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteUnitAction } from "@/app/(app)/properties/actions";

export function DeleteUnitButton({ unitId, propertyId, name }: { unitId: string; propertyId: string; name: string }) {
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
        description="This cannot be undone. Units with leases, maintenance requests or documents cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteUnitAction(unitId, propertyId);
          if (result.error) setError(result.error);
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
