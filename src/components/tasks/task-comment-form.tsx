"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addTaskCommentAction } from "@/app/(app)/tasks/actions";
import type { TaskCommentFormState } from "@/lib/validation/task";

const initialState: TaskCommentFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      <MessageSquarePlus className="size-3.5" /> Add comment
    </Button>
  );
}

export function TaskCommentForm({ taskId }: { taskId: string }) {
  const action = addTaskCommentAction.bind(null, taskId);
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2 rounded-md border border-border p-3" noValidate>
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <textarea
        name="comment"
        rows={2}
        placeholder="Add a comment or progress note..."
        className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {state.fieldErrors?.comment && <p className="text-xs text-destructive">{state.fieldErrors.comment[0]}</p>}
      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
