"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DocumentFormState } from "@/lib/validation/communication";

const initialState: DocumentFormState = {};

const ACCESS_LEVEL_LABELS: Record<string, string> = {
  internal: "Internal (default — anyone who can view this record)",
  restricted: "Restricted (only me + full document access)",
  public: "Public",
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" loading={pending}>
      <UploadCloud className="size-3.5" /> Upload
    </Button>
  );
}

type UploadAction = (prevState: DocumentFormState, formData: FormData) => Promise<DocumentFormState>;

export function UploadDocumentForm({ action }: { action: UploadAction }) {
  const [state, formAction] = useActionState(action, initialState);
  const [accessLevel, setAccessLevel] = useState("internal");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      {state.error && <p className="text-xs text-destructive">{state.error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt"
          className="flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
        />
        <input type="hidden" name="accessLevel" value={accessLevel} />
        <Select value={accessLevel} onValueChange={setAccessLevel}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <SubmitButton />
      </div>
      <p className="text-xs text-muted-foreground">PDF, Word, Excel, image or text files up to 15MB. Re-uploading the same filename adds a new version.</p>
    </form>
  );
}
