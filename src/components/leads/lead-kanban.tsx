"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { LeadStatus } from "@prisma/client";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Phone, Mail, Calendar, GripVertical, LayoutGrid } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { initials, cn } from "@/lib/utils";
import { updateLeadStatusAction } from "@/app/(app)/leads/actions";

const COLUMNS: { status: string; label: string }[] = [
  { status: "NEW", label: "New" },
  { status: "CONTACTED", label: "Contacted" },
  { status: "QUALIFIED", label: "Qualified" },
  { status: "NEGOTIATION", label: "Negotiation" },
  { status: "VIEWING_SCHEDULED", label: "Viewing Scheduled" },
  { status: "RESERVATION", label: "Reservation" },
  { status: "CLOSED_WON", label: "Closed Won" },
  { status: "CLOSED_LOST", label: "Closed Lost" },
];

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

export interface KanbanLead {
  id: string;
  code: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  nextFollowUpAt: string | Date | null;
  assignedTo: { id: string; firstName: string; lastName: string } | null;
}

function LeadCard({ lead, isOverlay }: { lead: KanbanLead; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });

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
        <Link href={`/leads/${lead.id}`} className="min-w-0 flex-1 hover:text-primary">
          <p className="truncate text-sm font-medium">
            {lead.firstName} {lead.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{lead.code}</p>
        </Link>
        <GripVertical className="size-4 shrink-0 text-muted-foreground/40" />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <Badge variant="outline" className="text-[10px]">
          {SOURCE_LABELS[lead.source] ?? lead.source}
        </Badge>
      </div>

      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
        {lead.phone && (
          <p className="flex items-center gap-1.5">
            <Phone className="size-3" /> {lead.phone}
          </p>
        )}
        {lead.email && (
          <p className="flex items-center gap-1.5 truncate">
            <Mail className="size-3 shrink-0" /> <span className="truncate">{lead.email}</span>
          </p>
        )}
        {lead.nextFollowUpAt && (
          <p className="flex items-center gap-1.5">
            <Calendar className="size-3" /> {new Date(lead.nextFollowUpAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {lead.assignedTo && (
        <div className="mt-2 flex items-center gap-1.5">
          <Avatar className="size-5">
            <AvatarFallback className="text-[9px]">{initials(lead.assignedTo.firstName, lead.assignedTo.lastName)}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{lead.assignedTo.firstName}</span>
        </div>
      )}
    </div>
  );
}

function Column({ status, label, leads }: { status: string; label: string; leads: KanbanLead[] }) {
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
        <Badge variant="secondary">{leads.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 120, maxHeight: "calc(100vh - 22rem)" }}>
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
}

export function LeadKanban({ leads: initialLeads }: { leads: KanbanLead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const map = new Map<string, KanbanLead[]>();
    for (const col of COLUMNS) map.set(col.status, []);
    for (const lead of leads) {
      const list = map.get(lead.status) ?? [];
      list.push(lead);
      map.set(lead.status, list);
    }
    return map;
  }, [leads]);

  const activeLead = leads.find((l) => l.id === activeId);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const leadId = String(active.id);
    const newStatus = String(over.id);
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    const previousStatus = lead.status;
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));

    startTransition(async () => {
      const result = await updateLeadStatusAction(leadId, newStatus as LeadStatus);
      if (result.error) {
        setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: previousStatus } : l)));
      }
    });
  }

  if (leads.length === 0) {
    return <EmptyState icon={LayoutGrid} title="No leads yet" description="Add your first lead to start building the pipeline." />;
  }

  return (
    <DndContext id="lead-kanban" sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <Column key={col.status} status={col.status} label={col.label} leads={grouped.get(col.status) ?? []} />
        ))}
      </div>
      <DragOverlay>{activeLead && <LeadCard lead={activeLead} isOverlay />}</DragOverlay>
    </DndContext>
  );
}
