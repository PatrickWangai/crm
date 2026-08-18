import { Badge, type BadgeProps } from "@/components/ui/badge";

type Variant = NonNullable<BadgeProps["variant"]>;

const STATUS_MAP: Record<string, { label: string; variant: Variant }> = {
  // Lead pipeline
  NEW: { label: "New", variant: "info" },
  CONTACTED: { label: "Contacted", variant: "secondary" },
  QUALIFIED: { label: "Qualified", variant: "default" },
  NEGOTIATION: { label: "Negotiation", variant: "warning" },
  VIEWING_SCHEDULED: { label: "Viewing Scheduled", variant: "info" },
  RESERVATION: { label: "Reservation", variant: "warning" },
  CLOSED_WON: { label: "Closed Won", variant: "success" },
  CLOSED_LOST: { label: "Closed Lost", variant: "destructive" },

  // Ticket status
  REQUEST_LOGGED: { label: "Request Logged", variant: "info" },
  ASSIGNED: { label: "Assigned", variant: "secondary" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  CLOSED: { label: "Closed", variant: "outline" },

  // Task status
  PENDING: { label: "Pending", variant: "secondary" },
  OVERDUE: { label: "Overdue", variant: "destructive" },

  // Priority
  LOW: { label: "Low", variant: "outline" },
  MEDIUM: { label: "Medium", variant: "info" },
  HIGH: { label: "High", variant: "warning" },
  URGENT: { label: "Urgent", variant: "destructive" },

  // Unit / property
  OCCUPIED: { label: "Occupied", variant: "success" },
  VACANT: { label: "Vacant", variant: "secondary" },
  RESERVED: { label: "Reserved", variant: "warning" },
  UNDER_MAINTENANCE: { label: "Under Maintenance", variant: "destructive" },

  // Lease
  ACTIVE: { label: "Active", variant: "success" },
  EXPIRED: { label: "Expired", variant: "destructive" },
  TERMINATED: { label: "Terminated", variant: "outline" },
  PENDING_RENEWAL: { label: "Pending Renewal", variant: "warning" },

  // Job card
  OPEN: { label: "Open", variant: "info" },

  // User status
  INACTIVE: { label: "Inactive", variant: "outline" },
  SUSPENDED: { label: "Suspended", variant: "destructive" },

  // Invoice
  DRAFT: { label: "Draft", variant: "outline" },
  SENT: { label: "Sent", variant: "info" },
  PARTIALLY_PAID: { label: "Partially Paid", variant: "warning" },
  PAID: { label: "Paid", variant: "success" },
  CANCELLED: { label: "Cancelled", variant: "outline" },
};

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_MAP[status] ?? { label: toTitleCase(status), variant: "secondary" as Variant };
  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
