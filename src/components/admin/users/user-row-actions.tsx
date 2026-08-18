"use client";

import { useState, useTransition } from "react";
import { MoreHorizontal, KeyRound, Ban, CheckCircle2, PauseCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { UserFormSheet, type Option } from "./user-form-sheet";
import { resetUserPasswordAction, setUserStatusAction } from "@/app/(app)/admin/users/actions";

interface UserRowActionsProps {
  userId: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  isSelf: boolean;
  roles: Option[];
  departments: Option[];
  businessUnits: Option[];
  managers: Option[];
  defaultValues: React.ComponentProps<typeof UserFormSheet>["defaultValues"];
}

export function UserRowActions({ userId, status, isSelf, roles, departments, businessUnits, managers, defaultValues }: UserRowActionsProps) {
  const [, startTransition] = useTransition();
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  return (
    <div className="flex items-center justify-end gap-1">
      <UserFormSheet
        mode="edit"
        userId={userId}
        roles={roles}
        departments={departments}
        businessUnits={businessUnits}
        managers={managers}
        defaultValues={defaultValues}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <ConfirmDialog
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <KeyRound /> Reset password
              </DropdownMenuItem>
            }
            title="Reset this user's password?"
            description="A new temporary password will be generated. The user will need to sign in with it."
            confirmLabel="Reset password"
            onConfirm={async () => {
              const result = await resetUserPasswordAction(userId);
              setTempPassword(result.tempPassword);
            }}
          />
          <DropdownMenuSeparator />
          {status !== "ACTIVE" && (
            <DropdownMenuItem onSelect={() => startTransition(() => setUserStatusAction(userId, "ACTIVE"))}>
              <CheckCircle2 /> Activate
            </DropdownMenuItem>
          )}
          {status !== "SUSPENDED" && !isSelf && (
            <DropdownMenuItem onSelect={() => startTransition(() => setUserStatusAction(userId, "SUSPENDED"))}>
              <PauseCircle /> Suspend
            </DropdownMenuItem>
          )}
          {status !== "INACTIVE" && !isSelf && (
            <DropdownMenuItem destructive onSelect={() => startTransition(() => setUserStatusAction(userId, "INACTIVE"))}>
              <Ban /> Deactivate
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={!!tempPassword} onOpenChange={(open) => !open && setTempPassword(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Password reset</DialogTitle>
            <DialogDescription>Share this temporary password securely — it won&apos;t be shown again.</DialogDescription>
          </DialogHeader>
          <div className="rounded-md border border-border bg-secondary/50 px-4 py-3 font-mono text-sm">{tempPassword}</div>
          <DialogFooter>
            <Button onClick={() => setTempPassword(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
