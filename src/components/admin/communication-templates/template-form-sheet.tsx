"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCommunicationTemplateAction, updateCommunicationTemplateAction } from "@/app/(app)/admin/communication-templates/actions";
import { TEMPLATE_CHANNELS } from "@/lib/validation/communication-template";
import type { CommunicationTemplateFormState } from "@/lib/validation/communication-template";

const initialState: CommunicationTemplateFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create template" : "Save changes"}
    </Button>
  );
}

export interface TemplateDefaults {
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  isActive: boolean;
}

export function TemplateFormSheet({
  mode,
  templateId,
  defaultValues,
}: {
  mode: "create" | "edit";
  templateId?: string;
  defaultValues?: TemplateDefaults;
}) {
  const [open, setOpen] = useState(false);
  const action = mode === "create" ? createCommunicationTemplateAction : updateCommunicationTemplateAction.bind(null, templateId!);
  const [state, formAction] = useActionState(action, initialState);
  const [channel, setChannel] = useState(defaultValues?.channel ?? "EMAIL");
  const [isActive, setIsActive] = useState(defaultValues?.isActive ?? true);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size={mode === "create" ? "default" : "icon"} variant={mode === "create" ? "default" : "ghost"}>
          {mode === "create" ? (
            <>
              <Plus /> Add template
            </>
          ) : (
            <Pencil className="size-4" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>{mode === "create" ? "Add communication template" : "Edit communication template"}</SheetTitle>
            <SheetDescription>Reusable message content staff can use when contacting leads and stakeholders.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name">Template name</Label>
              <Input id="name" name="name" defaultValue={defaultValues?.name} aria-invalid={!!state.fieldErrors?.name} />
              {state.fieldErrors?.name && <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="channel">Channel</Label>
              <input type="hidden" name="channel" value={channel} />
              <Select value={channel} onValueChange={setChannel}>
                <SelectTrigger id="channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_CHANNELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {channel === "EMAIL" && (
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject (optional)</Label>
                <Input id="subject" name="subject" defaultValue={defaultValues?.subject ?? ""} />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="body">Message body</Label>
              <textarea
                id="body"
                name="body"
                rows={6}
                defaultValue={defaultValues?.body ?? ""}
                className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-invalid={!!state.fieldErrors?.body}
              />
              {state.fieldErrors?.body && <p className="text-xs text-destructive">{state.fieldErrors.body[0]}</p>}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="hidden" name="isActive" value={isActive ? "true" : "false"} />
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} />
              <span>Active</span>
            </label>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton mode={mode} />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
