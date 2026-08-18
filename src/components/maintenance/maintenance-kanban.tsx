"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { JobCardStatus } from "@prisma/client";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { LayoutGrid, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { initials, cn } from "@/lib/utils";
import { updateMaintenanceStatusAction } from "@/app/(app)/maintenance/actions";

const COLUMNS: { status: JobCardStatus; label: string }[] = [
  { status: "OPEN", label: "Open" },
  { status: "ASSIGNED", label: "Assigned" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
  { status: "CLOSED", label: "Closed" },
];

const PRIORITY_VARIANT: Record<string, "outline" | "info" | "warning" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "destructive",
};

export interface KanbanRequest {
  id: string;
  jobCardNumber: string;
  issueDescription: string;
  priority: string;
  status: string;
  property: { id: string; name: string };
  unit: { id: string; unitNumber: string } | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
}

function RequestCard({ request, isOverlay }: { request: KanbanRequest; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: request.id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={cn(
        "group cursor-grab touch-none rounded-md border border-border bg-card p-3 shadow-sm transition-shadow active:cursor-grabbing",
        isDragging && !isOverlay && "opacity-30",
        isOverlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/maintenance/${request.id}`} className="min-w-0 flex-1 hover:text-primary">
          <p className="truncate text-sm font-medium">{request.issueDescription}</p>
          <p className="text-xs text-muted-foreground">{request.jobCardNumber}</p>
        </Link>
        <Badge variant={PRIORITY_VARIANT[request.priority]} className="shrink-0 text-[10px]">
          {request.priority}
        </Badge>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {request.property.name}
        {request.unit && ` · Unit ${request.unit.unitNumber}`}
      </p>

      <div className="mt-2 flex items-center justify-end">
        {request.assignedTo ? (
          <Avatar className="size-5">
            <AvatarFallback className="text-[9px]">{initials(request.assignedTo.firstName, request.assignedTo.lastName)}</AvatarFallback>
          </Avatar>
        ) : (
          <UserIcon className="size-4 text-muted-foreground/40" />
        )}
      </div>
    </div>
  );
}

function Column({ status, label, requests }: { status: JobCardStatus; label: string; requests: KanbanRequest[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg border border-border bg-secondary/40 transition-colors",
        isOver && "border-primary bg-primary/5",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <p className="text-sm font-medium">{label}</p>
        <Badge variant="secondary">{requests.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 120, maxHeight: "calc(100vh - 22rem)" }}>
        {requests.map((request) => (
          <RequestCard key={request.id} request={request} />
        ))}
      </div>
    </div>
  );
}

export function MaintenanceKanban({ requests: initialRequests }: { requests: KanbanRequest[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const map = new Map<string, KanbanRequest[]>();
    for (const col of COLUMNS) map.set(col.status, []);
    for (const request of requests) {
      const list = map.get(request.status) ?? [];
      list.push(request);
      map.set(request.status, list);
    }
    return map;
  }, [requests]);

  const activeRequest = requests.find((r) => r.id === activeId);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const requestId = String(active.id);
    const newStatus = String(over.id) as JobCardStatus;
    const request = requests.find((r) => r.id === requestId);
    if (!request || request.status === newStatus) return;

    const previousStatus = request.status;
    setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: newStatus } : r)));

    startTransition(async () => {
      const result = await updateMaintenanceStatusAction(requestId, newStatus);
      if (result.error) {
        setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: previousStatus } : r)));
      }
    });
  }

  if (requests.length === 0) {
    return <EmptyState icon={LayoutGrid} title="No job cards yet" description="Log your first maintenance request to start tracking work." />;
  }

  return (
    <DndContext id="maintenance-kanban" sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <Column key={col.status} status={col.status} label={col.label} requests={grouped.get(col.status) ?? []} />
        ))}
      </div>
      <DragOverlay>{activeRequest && <RequestCard request={activeRequest} isOverlay />}</DragOverlay>
    </DndContext>
  );
}
