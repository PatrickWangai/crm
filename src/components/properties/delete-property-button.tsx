"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deletePropertyAction } from "@/app/(app)/properties/actions";

export function DeletePropertyButton({ propertyId, name }: { propertyId: string; name: string }) {
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
        title={`Delete "${name}"?`}
        description="This cannot be undone. Properties with units, maintenance requests or documents cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deletePropertyAction(propertyId);
          if (result.error) setError(result.error);
          else router.push("/properties");
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
