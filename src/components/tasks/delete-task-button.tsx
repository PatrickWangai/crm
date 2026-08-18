"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteTaskAction } from "@/app/(app)/tasks/actions";

export function DeleteTaskButton({ taskId, title }: { taskId: string; title: string }) {
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
        title={`Delete "${title}"?`}
        description="This cannot be undone. Tasks with linked documents cannot be deleted."
        confirmLabel="Delete"
        confirmVariant="destructive"
        onConfirm={async () => {
          const result = await deleteTaskAction(taskId);
          if (result.error) setError(result.error);
          else router.push("/tasks");
        }}
      />
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
