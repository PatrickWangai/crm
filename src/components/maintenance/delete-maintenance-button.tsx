"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteMaintenanceAction } from "@/app/(app)/maintenance/actions";

export function DeleteMaintenanceButton({ requestId, jobCardNumber }: { requestId: string; jobCardNumber: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <ConfirmDialog
        trigger={
          <Button variant="outline" size="icon">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        }
        title={`Delete "${jobCardNumber}"?`}
        description="This cannot be undone. Job cards with linked documents cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteMaintenanceAction(requestId);
          if (result.error) setError(result.error);
          else router.push("/maintenance");
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
