"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteDocumentAction } from "@/app/(app)/stakeholders/actions";

export function DeleteDocumentButton({ documentId, stakeholderId, fileName }: { documentId: string; stakeholderId: string; fileName: string }) {
  return (
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
        await deleteDocumentAction(documentId, stakeholderId);
      }}
    />
  );
}
