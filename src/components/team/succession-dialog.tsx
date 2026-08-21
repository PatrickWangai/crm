"use client";

import { useActionState, useState } from "react";
import { UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { succeedDepartmentHeadAction, type SuccessionFormState } from "@/app/(app)/team/actions";

interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  role: { name: string };
}

const initialState: SuccessionFormState = {};

/** Only rendered when the actor is the current department head and there's at least one eligible teammate — see listSuccessionCandidates(). */
export function SuccessionDialog({ headRoleName, candidates }: { headRoleName: string; candidates: Candidate[] }) {
  const [open, setOpen] = useState(false);
  const [successorId, setSuccessorId] = useState("");
  const [state, formAction, pending] = useActionState(succeedDepartmentHeadAction, initialState);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <UserCog className="size-4" /> Leave & appoint successor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave & appoint a successor</DialogTitle>
          <DialogDescription>
            Choose who takes over as {headRoleName}. Your own account will be deactivated immediately and you&apos;ll be signed out — this can&apos;t be undone from here, ICT
            would need to reactivate your account.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="successorUserId" value={successorId} />
          <Select value={successorId} onValueChange={setSuccessorId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a successor" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.firstName} {c.lastName} — {c.role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={pending || !successorId}>
              {pending ? "Handing off..." : "Confirm hand-off"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
