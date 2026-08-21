import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { checkRateLimit } from "@/lib/api/rate-limit";

// Deliberately wide open (no api-key, unlike /api/public/support-requests) —
// this is fired directly from anonymous browsers on the help page, both this
// app's own /help and the standalone customer app's page (cross-origin, see
// the CORS headers below). The payload is non-sensitive telemetry (a random
// per-browser sessionId, a path, an optional ticket number the visitor
// already knows), so an api-key would only mean exposing a secret in
// client-visible code with no real security benefit — rate limiting by IP
// is the actual abuse guard here.
const presencePayloadSchema = z.object({
  sessionId: z.string().trim().min(10).max(80),
  source: z.enum(["crm", "customer"]),
  path: z.string().trim().min(1).max(200),
  ticketNumber: z.string().trim().max(30).optional().or(z.literal("")),
  action: z.enum(["pageview", "heartbeat"]),
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit("presence", ip, 200)) {
    return NextResponse.json({ ok: false }, { status: 429, headers: corsHeaders() });
  }

  try {
    const body = await request.json();
    const payload = presencePayloadSchema.parse(body);

    await prisma.helpPageVisit.upsert({
      where: { sessionId: payload.sessionId },
      update: {
        lastSeenAt: new Date(),
        path: payload.path,
        ticketNumber: payload.ticketNumber || undefined,
        pageViews: payload.action === "pageview" ? { increment: 1 } : undefined,
      },
      create: {
        sessionId: payload.sessionId,
        source: payload.source,
        path: payload.path,
        ticketNumber: payload.ticketNumber || undefined,
      },
    });

    return NextResponse.json({ ok: true }, { headers: corsHeaders() });
  } catch {
    // Best-effort telemetry — a malformed beacon must never surface an
    // error to the visitor's browser.
    return NextResponse.json({ ok: false }, { status: 200, headers: corsHeaders() });
  }
}
