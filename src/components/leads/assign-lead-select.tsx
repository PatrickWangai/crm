"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignLeadAction } from "@/app/(app)/leads/actions";
import type { Option } from "@/components/admin/users/user-form-sheet";

const UNASSIGNED = "__unassigned__";

export function AssignLeadSelect({ leadId, staff, currentAssigneeId }: { leadId: string; staff: Option[]; currentAssigneeId: string | null }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={currentAssigneeId ?? UNASSIGNED}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          await assignLeadAction(leadId, value === UNASSIGNED ? null : value);
        })
      }
    >
      <SelectTrigger className="w-56">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
        {staff.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
