import { NextResponse, type NextRequest } from "next/server";
import { getTicketStatusForBridge } from "@/lib/services/public-support.service";
import { toErrorResponse } from "@/lib/api/errors";
import { checkRateLimit } from "@/lib/api/rate-limit";

/**
 * Read-only counterpart to POST /api/public/support-requests: lets the
 * standalone customer app pull the live status of a ticket it already
 * created (via crmTicketNumber, stored on submission), so its own tracking
 * tab shows real progress instead of a permanently-stale local status. Same
 * shared-secret auth, no email check needed — the caller already proved
 * ownership by knowing the exact ticket number it was given at creation.
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !process.env.PUBLIC_API_KEY || apiKey !== process.env.PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit("bridge-status", ip, 120)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const ticketNumber = request.nextUrl.searchParams.get("ticketNumber");
  if (!ticketNumber) {
    return NextResponse.json({ error: "ticketNumber is required" }, { status: 400 });
  }

  try {
    const result = await getTicketStatusForBridge(ticketNumber);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err);
  }
}
