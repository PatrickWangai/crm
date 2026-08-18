"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createLeadAction, updateLeadAction, type LeadFormState } from "@/app/(app)/leads/actions";
import { LEAD_SOURCES } from "@/lib/validation/lead";
import type { Option } from "@/components/admin/users/user-form-sheet";

const SOURCE_LABELS: Record<string, string> = {
  WEBSITE: "Website",
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  LINKEDIN: "LinkedIn",
  EMAIL: "Email",
  WALK_IN: "Walk-in",
  REFERRAL: "Referral",
  PROPERTY_INQUIRY: "Property Inquiry",
  CAMPAIGN: "Campaign",
  OTHER: "Other",
};

const initialState: LeadFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create lead" : "Save changes"}
    </Button>
  );
}

export interface LeadDefaults {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: string;
  sourceDetail: string | null;
  requirements: string | null;
  businessUnitId: string | null;
  assignedToId: string | null;
  nextFollowUpAt: string | null;
}

export function LeadFormSheet({
  mode,
  leadId,
  businessUnits,
  staff,
  defaultValues,
  trigger,
  redirectOnCreate,
}: {
  mode: "create" | "edit";
  leadId?: string;
  businessUnits: Option[];
  staff: Option[];
  defaultValues?: LeadDefaults;
  trigger?: React.ReactNode;
  redirectOnCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const action = mode === "create" ? createLeadAction : updateLeadAction.bind(null, leadId!);
  const [state, formAction] = useActionState(action, initialState);
  const [source, setSource] = useState(defaultValues?.source ?? "WEBSITE");
  const [businessUnitId, setBusinessUnitId] = useState(defaultValues?.businessUnitId ?? "");
  const [assignedToId, setAssignedToId] = useState(defaultValues?.assignedToId ?? "");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  useEffect(() => {
    if (state.success && mode === "create" && redirectOnCreate && state.leadId) {
      router.push(`/leads/${state.leadId}`);
    }
  }, [state, mode, redirectOnCreate, router]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size={mode === "create" ? "default" : "icon"} variant={mode === "create" ? "default" : "ghost"}>
            {mode === "create" ? (
              <>
                <Plus /> Add lead
              </>
            ) : (
              <Pencil className="size-4" />
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
          <SheetHeader>
            <SheetTitle>{mode === "create" ? "Add lead" : "Edit lead"}</SheetTitle>
            <SheetDescription>Capture a prospect and route it into the sales pipeline.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" name="firstName" error={state.fieldErrors?.firstName} defaultValue={defaultValues?.firstName} />
              <Field label="Last name" name="lastName" error={state.fieldErrors?.lastName} defaultValue={defaultValues?.lastName} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" name="email" type="email" error={state.fieldErrors?.email} defaultValue={defaultValues?.email ?? ""} />
              <Field label="Phone" name="phone" error={state.fieldErrors?.phone} defaultValue={defaultValues?.phone ?? ""} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="source">Lead source</Label>
              <input type="hidden" name="source" value={source} />
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger id="source">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SOURCE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              label="Source detail"
              name="sourceDetail"
              error={state.fieldErrors?.sourceDetail}
              defaultValue={defaultValues?.sourceDetail ?? ""}
              placeholder="e.g. Referred by John Doe, Spring campaign"
            />

            <div className="space-y-1.5">
              <Label htmlFor="requirements">Requirements</Label>
              <textarea
                id="requirements"
                name="requirements"
                rows={3}
                defaultValue={defaultValues?.requirements ?? ""}
                placeholder="What is this lead looking for?"
                className="w-full resize-y rounded-md border border-input bg-card px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>

            <Field
              label="Next follow-up"
              name="nextFollowUpAt"
              type="datetime-local"
              error={state.fieldErrors?.nextFollowUpAt}
              defaultValue={defaultValues?.nextFollowUpAt ?? ""}
            />

            <div className="space-y-1.5">
              <Label htmlFor="businessUnitId">Business unit</Label>
              <input type="hidden" name="businessUnitId" value={businessUnitId} />
              <Select value={businessUnitId} onValueChange={setBusinessUnitId}>
                <SelectTrigger id="businessUnitId">
                  <SelectValue placeholder="No business unit" />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits.map((bu) => (
                    <SelectItem key={bu.id} value={bu.id}>
                      {bu.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assignedToId">Assigned agent</Label>
              <input type="hidden" name="assignedToId" value={assignedToId} />
              <Select value={assignedToId} onValueChange={setAssignedToId}>
                <SelectTrigger id="assignedToId">
                  <SelectValue placeholder="Unassigned (lead pool)" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

function Field({
  label,
  name,
  type = "text",
  error,
  defaultValue,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  error?: string[];
  defaultValue?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
