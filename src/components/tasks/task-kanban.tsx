"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { TaskStatus } from "@prisma/client";
import { DndContext, DragOverlay, useDraggable, useDroppable, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { Calendar, LayoutGrid, User as UserIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { initials, cn } from "@/lib/utils";
import { updateTaskStatusAction } from "@/app/(app)/tasks/actions";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "PENDING", label: "Pending" },
  { status: "IN_PROGRESS", label: "In Progress" },
  { status: "COMPLETED", label: "Completed" },
  { status: "OVERDUE", label: "Overdue" },
];

const PRIORITY_VARIANT: Record<string, "outline" | "info" | "warning" | "destructive"> = {
  LOW: "outline",
  MEDIUM: "info",
  HIGH: "warning",
  URGENT: "destructive",
};

export interface KanbanTask {
  id: string;
  code: string;
  title: string;
  priority: string;
  status: string;
  dueDate: string | Date | null;
  assignee: { id: string; firstName: string; lastName: string } | null;
}

function TaskCard({ task, isOverlay }: { task: KanbanTask; isOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });

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
        <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1 hover:text-primary">
          <p className="truncate text-sm font-medium">{task.title}</p>
          <p className="text-xs text-muted-foreground">{task.code}</p>
        </Link>
        <Badge variant={PRIORITY_VARIANT[task.priority]} className="shrink-0 text-[10px]">
          {task.priority}
        </Badge>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        {task.dueDate ? (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" /> {new Date(task.dueDate).toLocaleDateString()}
          </span>
        ) : (
          <span />
        )}
        {task.assignee ? (
          <Avatar className="size-5">
            <AvatarFallback className="text-[9px]">{initials(task.assignee.firstName, task.assignee.lastName)}</AvatarFallback>
          </Avatar>
        ) : (
          <UserIcon className="size-4 text-muted-foreground/40" />
        )}
      </div>
    </div>
  );
}

function Column({ status, label, tasks }: { status: TaskStatus; label: string; tasks: KanbanTask[] }) {
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
        <Badge variant="secondary">{tasks.length}</Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ minHeight: 120, maxHeight: "calc(100vh - 22rem)" }}>
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

export function TaskKanban({ tasks: initialTasks }: { tasks: KanbanTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(() => {
    const map = new Map<string, KanbanTask[]>();
    for (const col of COLUMNS) map.set(col.status, []);
    for (const task of tasks) {
      const list = map.get(task.status) ?? [];
      list.push(task);
      map.set(task.status, list);
    }
    return map;
  }, [tasks]);

  const activeTask = tasks.find((t) => t.id === activeId);

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const taskId = String(active.id);
    const newStatus = String(over.id) as TaskStatus;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    const previousStatus = task.status;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));

    startTransition(async () => {
      const result = await updateTaskStatusAction(taskId, newStatus);
      if (result.error) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: previousStatus } : t)));
      }
    });
  }

  if (tasks.length === 0) {
    return <EmptyState icon={LayoutGrid} title="No tasks yet" description="Add your first task to start tracking work." />;
  }

  return (
    <DndContext id="task-kanban" sensors={sensors} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => (
          <Column key={col.status} status={col.status} label={col.label} tasks={grouped.get(col.status) ?? []} />
        ))}
      </div>
      <DragOverlay>{activeTask && <TaskCard task={activeTask} isOverlay />}</DragOverlay>
    </DndContext>
  );
}
