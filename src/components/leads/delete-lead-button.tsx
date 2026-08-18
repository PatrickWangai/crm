"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteLeadAction } from "@/app/(app)/leads/actions";

export function DeleteLeadButton({ leadId, name }: { leadId: string; name: string }) {
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
        description="This cannot be undone. Leads with linked communications, documents or opportunities cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteLeadAction(leadId);
          if (result.error) setError(result.error);
          else router.push("/leads");
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
