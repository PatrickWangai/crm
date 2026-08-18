"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { TicketStatus } from "@prisma/client";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { LayoutGrid, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SlaBadge } from "@/components/sla-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { initials, cn } from "@/lib/utils";
import { updateTicketStatusAction } from "@/app/(app)/tickets/actions";

const COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: "REQUEST_LOGGED", label: "Request Logged" },
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

export interface KanbanTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  priority: string;
  status: string;
  dueAt: string | Date | null;
  stakeholder: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
}

function TicketCard({ ticket, isOverlay }: { ticket: KanbanTicket; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: ticket.id });

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
        <Link href={`/tickets/${ticket.id}`} className="min-w-0 flex-1 hover:text-primary">
          <p className="truncate text-sm font-medium">{ticket.subject}</p>
          <p className="text-xs text-muted-foreground">{ticket.ticketNumber}</p>
        </Link>
        <Badge variant={PRIORITY_VARIANT[ticket.priority]} className="shrink-0 text-[10px]">
          {ticket.priority}
        </Badge>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {ticket.stakeholder.firstName} {ticket.stakeholder.lastName}
      </p>

      <div className="mt-2 flex items-center justify-between gap-2">
        <SlaBadge dueAt={ticket.dueAt} status={ticket.status} className="text-[10px]" />
        {ticket.assignedTo ? (
          <div className="flex items-center gap-1.5">
            <Avatar className="size-5">
              <AvatarFallback className="text-[9px]">{initials(ticket.assignedTo.firstName, ticket.assignedTo.lastName)}</AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <UserIcon className="size-4 text-muted-foreground/40" />
        )}
      </div>
    </div>
  );
}

function Column({ status, label, tickets }: { status: TicketStatus; label: string; tickets: KanbanTicket[] }) {
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
        <Badge variant="secondary">{tickets.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 120, maxHeight: "calc(100vh - 22rem)" }}>
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </div>
  );
}

export function TicketKanban({ tickets: initialTickets }: { tickets: KanbanTicket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const map = new Map<string, KanbanTicket[]>();
    for (const col of COLUMNS) map.set(col.status, []);
    for (const ticket of tickets) {
      const list = map.get(ticket.status) ?? [];
      list.push(ticket);
      map.set(ticket.status, list);
    }
    return map;
  }, [tickets]);

  const activeTicket = tickets.find((t) => t.id === activeId);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const ticketId = String(active.id);
    const newStatus = String(over.id) as TicketStatus;
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket || ticket.status === newStatus) return;

    const previousStatus = ticket.status;
    setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t)));

    startTransition(async () => {
      const result = await updateTicketStatusAction(ticketId, newStatus);
      if (result.error) {
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status: previousStatus } : t)));
      }
    });
  }

  if (tickets.length === 0) {
    return <EmptyState icon={LayoutGrid} title="No tickets yet" description="Log your first ticket to start tracking customer requests." />;
  }

  return (
    <DndContext id="ticket-kanban" sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <Column key={col.status} status={col.status} label={col.label} tickets={grouped.get(col.status) ?? []} />
        ))}
      </div>
      <DragOverlay>{activeTicket && <TicketCard ticket={activeTicket} isOverlay />}</DragOverlay>
    </DndContext>
  );
}
