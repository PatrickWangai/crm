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
import { createStakeholderAction, updateStakeholderAction, type StakeholderFormState } from "@/app/(app)/stakeholders/actions";
import { STAKEHOLDER_TYPES } from "@/lib/validation/stakeholder";
import type { Option } from "@/components/admin/users/user-form-sheet";

const TYPE_LABELS: Record<string, string> = {
  CUSTOMER: "Customer",
  TENANT: "Tenant",
  LANDLORD: "Landlord",
  SACCO_MEMBER: "SACCO Member",
  INSURANCE_CLIENT: "Insurance Client",
  INVESTOR: "Investor",
  PROSPECT: "Prospect",
  OTHER: "Other",
};

const initialState: StakeholderFormState = {};

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      {mode === "create" ? "Create stakeholder" : "Save changes"}
    </Button>
  );
}

export interface StakeholderDefaults {
  type: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  idNumber: string | null;
  kraPin: string | null;
  businessUnitId: string | null;
  assignedStaffId: string | null;
}

export function StakeholderFormSheet({
  mode,
  stakeholderId,
  businessUnits,
  staff,
  defaultValues,
  trigger,
  redirectOnCreate,
}: {
  mode: "create" | "edit";
  stakeholderId?: string;
  businessUnits: Option[];
  staff: Option[];
  defaultValues?: StakeholderDefaults;
  trigger?: React.ReactNode;
  redirectOnCreate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const action = mode === "create" ? createStakeholderAction : updateStakeholderAction.bind(null, stakeholderId!);
  const [state, formAction] = useActionState(action, initialState);
  const [type, setType] = useState(defaultValues?.type ?? "CUSTOMER");
  const [businessUnitId, setBusinessUnitId] = useState(defaultValues?.businessUnitId ?? "");
  const [assignedStaffId, setAssignedStaffId] = useState(defaultValues?.assignedStaffId ?? "");

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success) setOpen(false);
  }

  useEffect(() => {
    if (state.success && mode === "create" && redirectOnCreate && state.stakeholderId) {
      router.push(`/stakeholders/${state.stakeholderId}`);
    }
  }, [state, mode, redirectOnCreate, router]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button size={mode === "create" ? "default" : "icon"} variant={mode === "create" ? "default" : "ghost"}>
            {mode === "create" ? (
              <>
                <Plus /> Add stakeholder
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
            <SheetTitle>{mode === "create" ? "Add stakeholder" : "Edit stakeholder"}</SheetTitle>
            <SheetDescription>
              Customers, tenants, landlords, SACCO members, insurance clients and other contacts share one profile.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {state.error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="type">Stakeholder type</Label>
              <input type="hidden" name="type" value={type} />
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAKEHOLDER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="First name" name="firstName" error={state.fieldErrors?.firstName} defaultValue={defaultValues?.firstName} />
              <Field label="Last name" name="lastName" error={state.fieldErrors?.lastName} defaultValue={defaultValues?.lastName} />
            </div>
            <Field label="Organization" name="organization" error={state.fieldErrors?.organization} defaultValue={defaultValues?.organization ?? ""} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" name="email" type="email" error={state.fieldErrors?.email} defaultValue={defaultValues?.email ?? ""} />
              <Field label="Phone" name="phone" error={state.fieldErrors?.phone} defaultValue={defaultValues?.phone ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Alternate phone" name="alternatePhone" error={state.fieldErrors?.alternatePhone} defaultValue={defaultValues?.alternatePhone ?? ""} />
              <Field label="City" name="city" error={state.fieldErrors?.city} defaultValue={defaultValues?.city ?? ""} />
            </div>
            <Field label="Address" name="address" error={state.fieldErrors?.address} defaultValue={defaultValues?.address ?? ""} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="ID number" name="idNumber" error={state.fieldErrors?.idNumber} defaultValue={defaultValues?.idNumber ?? ""} />
              <Field label="KRA PIN" name="kraPin" error={state.fieldErrors?.kraPin} defaultValue={defaultValues?.kraPin ?? ""} />
            </div>

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
              <Label htmlFor="assignedStaffId">Assigned staff</Label>
              <input type="hidden" name="assignedStaffId" value={assignedStaffId} />
              <Select value={assignedStaffId} onValueChange={setAssignedStaffId}>
                <SelectTrigger id="assignedStaffId">
                  <SelectValue placeholder="Unassigned" />
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
}: {
  label: string;
  name: string;
  type?: string;
  error?: string[];
  defaultValue?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} aria-invalid={!!error} />
      {error && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
