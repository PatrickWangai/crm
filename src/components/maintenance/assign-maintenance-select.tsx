"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignMaintenanceAction } from "@/app/(app)/maintenance/actions";
import type { Option } from "@/components/admin/users/user-form-sheet";

const UNASSIGNED = "__unassigned__";

export function AssignMaintenanceSelect({ requestId, staff, currentAssigneeId }: { requestId: string; staff: Option[]; currentAssigneeId: string | null }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Select
      value={currentAssigneeId ?? UNASSIGNED}
      disabled={isPending}
      onValueChange={(value) =>
        startTransition(async () => {
          await assignMaintenanceAction(requestId, value === UNASSIGNED ? null : value);
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
