"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, KeyRound, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTeamMemberAction, type TeamMemberFormState } from "@/app/(app)/team/actions";

interface RoleOption {
  id: string;
  name: string;
}

const initialState: TeamMemberFormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" loading={pending}>
      Add team member
    </Button>
  );
}

/** Deliberately no department/business unit/reports-to fields — the server always forces those to the actor's own, so there's nothing meaningful for this form to offer there. */
export function TeamMemberFormSheet({ roles, departmentName }: { roles: RoleOption[]; departmentName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(createTeamMemberAction, initialState);
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [copied, setCopied] = useState(false);

  const [prevState, setPrevState] = useState(state);
  if (state !== prevState) {
    setPrevState(state);
    if (state.success && !state.tempPassword) setOpen(false);
  }

  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setCopied(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> Add team member
        </Button>
      </SheetTrigger>
      <SheetContent>
        {state.tempPassword ? (
          <>
            <SheetHeader>
              <SheetTitle>Team member added</SheetTitle>
              <SheetDescription>Share this temporary password securely — it won&apos;t be shown again.</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary/50 px-4 py-3">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <KeyRound className="size-4 text-muted-foreground" />
                  {state.tempPassword}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(state.tempPassword!);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">They should sign in and change this password from their profile as soon as possible.</p>
            </SheetBody>
            <SheetFooter>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </SheetFooter>
          </>
        ) : (
          <form action={formAction} className="flex flex-1 flex-col overflow-hidden" noValidate>
            <SheetHeader>
              <SheetTitle>Add team member</SheetTitle>
              <SheetDescription>Creates a {departmentName} account — they can be assigned tickets and tasks routed to your department right away.</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              {state.error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" name="firstName" aria-invalid={!!state.fieldErrors?.firstName} />
                  {state.fieldErrors?.firstName && <p className="text-xs text-destructive">{state.fieldErrors.firstName[0]}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" name="lastName" aria-invalid={!!state.fieldErrors?.lastName} />
                  {state.fieldErrors?.lastName && <p className="text-xs text-destructive">{state.fieldErrors.lastName[0]}</p>}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" aria-invalid={!!state.fieldErrors?.email} />
                {state.fieldErrors?.email && <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" aria-invalid={!!state.fieldErrors?.phone} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input id="jobTitle" name="jobTitle" aria-invalid={!!state.fieldErrors?.jobTitle} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="roleId">
                  Role <span className="text-destructive">*</span>
                </Label>
                <input type="hidden" name="roleId" value={roleId} />
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger id="roleId" aria-invalid={!!state.fieldErrors?.roleId}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {state.fieldErrors?.roleId && <p className="text-xs text-destructive">{state.fieldErrors.roleId[0]}</p>}
              </div>
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <SubmitButton />
            </SheetFooter>
          </form>
        )}
      </SheetContent>
    </Sheet>
  );
}
