import "server-only";
import { prisma } from "@/lib/db/prisma";
import { requireAnyPermission } from "@/lib/rbac/guard";
import { recordAudit } from "@/lib/audit/log";
import type { SubmitReviewInput } from "@/lib/validation/public-support";

export type ReviewEligibility =
  | { status: "not_found" }
  | { status: "not_completed" }
  | { status: "already_reviewed" }
  | { status: "eligible"; ticketNumber: string; subject: string; departmentName: string | null };

/**
 * Same (ticketNumber, email) shared-secret pairing as the public tracker —
 * verifies the link came from the real completion email before showing the
 * review form, without requiring a login.
 */
export async function getReviewEligibility(ticketNumber: string, email: string): Promise<ReviewEligibility> {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber },
    include: {
      stakeholder: { select: { email: true } },
      department: { select: { name: true } },
      review: { select: { id: true } },
    },
  });
  if (!ticket || !ticket.stakeholder.email || ticket.stakeholder.email.toLowerCase() !== email.toLowerCase()) {
    return { status: "not_found" };
  }
  if (ticket.status !== "COMPLETED" && ticket.status !== "CLOSED") {
    return { status: "not_completed" };
  }
  if (ticket.review) {
    return { status: "already_reviewed" };
  }
  return { status: "eligible", ticketNumber: ticket.ticketNumber, subject: ticket.subject, departmentName: ticket.department?.name ?? null };
}

/**
 * departmentId is snapshotted from the ticket at submission time (not a
 * live relation) — see the Review model's own doc comment for why.
 */
export async function submitCustomerReview(input: SubmitReviewInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const ticket = await prisma.ticket.findUnique({
    where: { ticketNumber: input.ticketNumber },
    include: { stakeholder: { select: { id: true, email: true } }, review: { select: { id: true } } },
  });
  if (!ticket || !ticket.stakeholder.email || ticket.stakeholder.email.toLowerCase() !== input.email.toLowerCase()) {
    return { ok: false, error: "We couldn't verify that request. Double-check the link from your email." };
  }
  if (ticket.status !== "COMPLETED" && ticket.status !== "CLOSED") {
    return { ok: false, error: "This request hasn't been marked done yet." };
  }
  if (ticket.review) {
    return { ok: false, error: "You've already reviewed this request — thank you!" };
  }

  try {
    await prisma.review.create({
      data: {
        ticketId: ticket.id,
        stakeholderId: ticket.stakeholderId,
        departmentId: ticket.departmentId,
        rating: input.rating,
        comment: input.comment || undefined,
      },
    });
  } catch (err) {
    // P2002 unique constraint on ticketId — two near-simultaneous
    // submissions for the same ticket lost the race, not a real error.
    if (err && typeof err === "object" && "code" in err && err.code === "P2002") {
      return { ok: false, error: "You've already reviewed this request — thank you!" };
    }
    throw err;
  }

  await recordAudit({
    userId: null,
    action: "review.submitted",
    entityType: "Review",
    entityId: ticket.id,
    newValue: { rating: input.rating, ticketNumber: ticket.ticketNumber },
  });

  return { ok: true };
}

export interface DepartmentReviewSummary {
  departmentId: string | null;
  departmentName: string;
  averageRating: number;
  reviewCount: number;
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: Date;
    ticketNumber: string;
    subject: string;
    stakeholderName: string;
  }[];
}

/** Board/CEO-facing breakdown — every review grouped by the department that actually did the work, most-reviewed department first. */
export async function listDepartmentReviewSummaries(): Promise<DepartmentReviewSummary[]> {
  await requireAnyPermission(["reviews.view_all"]);

  const reviews = await prisma.review.findMany({
    include: {
      department: { select: { id: true, name: true } },
      ticket: { select: { ticketNumber: true, subject: true } },
      stakeholder: { select: { firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const byDept = new Map<string, DepartmentReviewSummary>();
  for (const r of reviews) {
    const key = r.departmentId ?? "unassigned";
    if (!byDept.has(key)) {
      byDept.set(key, {
        departmentId: r.departmentId,
        departmentName: r.department?.name ?? "Unassigned",
        averageRating: 0,
        reviewCount: 0,
        reviews: [],
      });
    }
    byDept.get(key)!.reviews.push({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      ticketNumber: r.ticket.ticketNumber,
      subject: r.ticket.subject,
      stakeholderName: `${r.stakeholder.firstName} ${r.stakeholder.lastName}`,
    });
  }

  for (const entry of byDept.values()) {
    entry.reviewCount = entry.reviews.length;
    entry.averageRating = entry.reviews.reduce((sum, r) => sum + r.rating, 0) / entry.reviewCount;
  }

  return Array.from(byDept.values()).sort((a, b) => b.reviewCount - a.reviewCount);
}
