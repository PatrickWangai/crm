import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { publicSupportRequestSchema } from "@/lib/validation/public-support";
import { submitPublicSupportRequest } from "@/lib/services/public-support.service";
import { toErrorResponse } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

// Same fields as the CRM's own /help form, but businessUnitCode (a stable,
// publicly-knowable code like "MRE") instead of businessUnitId (an opaque
// cuid only this database knows) — the caller can't look up IDs.
const bridgePayloadSchema = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  phone: z.string().trim().min(7).max(20).optional().or(z.literal("")),
  businessUnitCode: z.enum(["MGC", "MRE", "MSL", "MIA", "MHL"]).optional(),
  category: z.string().trim().min(1).max(80),
  subject: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(2000),
});

/**
 * Server-to-server bridge for the standalone customer Help & Support app
 * (a separate repo/deployment with its own database) to create a real
 * Ticket here, so submissions land in the normal staff queue with SLA
 * matching and a tickets.assign notification — same as the CRM's own
 * /help page, just reached over HTTP instead of a same-process call.
 * Protected by a shared secret (x-api-key), not user auth — there's no
 * logged-in user on the calling side. Keep PUBLIC_API_KEY out of any
 * client-visible code in the customer app; it must only be read
 * server-side there.
 */
export async function POST(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !process.env.PUBLIC_API_KEY || apiKey !== process.env.PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Defense in depth: the caller is trusted (valid key), but this still
  // caps how much damage a bug or compromise on the calling side can do.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit("bridge-submit", ip, 60)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const payload = bridgePayloadSchema.parse(body);

    const businessUnit = payload.businessUnitCode
      ? await prisma.businessUnit.findUnique({ where: { code: payload.businessUnitCode }, select: { id: true } })
      : null;

    const parsed = publicSupportRequestSchema.parse({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email ?? "",
      phone: payload.phone ?? "",
      businessUnitId: businessUnit?.id ?? "",
      category: payload.category,
      subject: payload.subject,
      description: payload.description,
    });

    const result = await submitPublicSupportRequest(parsed);
    return NextResponse.json({
      ticketNumber: result.ticketNumber,
      expectedResponseBy: result.expectedResponseBy ? result.expectedResponseBy.toISOString() : null,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
