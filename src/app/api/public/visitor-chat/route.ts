import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sendPublicVisitorMessage, listPublicVisitorThread } from "@/lib/services/live-chat.service";
import { checkRateLimit } from "@/lib/api/rate-limit";

// Same open-CORS, no-api-key pattern as /api/public/presence and
// /api/public/live-chat — a random sessionId (not a ticketNumber+email
// pair) is the only "auth" here, appropriate for pre-ticket telemetry-
// adjacent chat. Reached directly from the browser on both this app's own
// /help page and the standalone customer app.
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

function clientIp(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
}

const sessionIdSchema = z.string().trim().min(10).max(80);
const sendSchema = z.object({ sessionId: sessionIdSchema, content: z.string().trim().min(1).max(1000) });

export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  if (!checkRateLimit("visitor-chat-poll", ip, 120)) {
    return NextResponse.json({ ok: false }, { status: 429, headers: corsHeaders() });
  }

  const { searchParams } = new URL(request.url);
  const parsed = sessionIdSchema.safeParse(searchParams.get("sessionId"));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders() });

  const messages = await listPublicVisitorThread(parsed.data);
  return NextResponse.json({ ok: true, messages }, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!checkRateLimit("visitor-chat-send", ip, 30)) {
    return NextResponse.json({ ok: false, error: "Too many messages — please slow down." }, { status: 429, headers: corsHeaders() });
  }

  try {
    const body = await request.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Check your message and try again." }, { status: 400, headers: corsHeaders() });

    const message = await sendPublicVisitorMessage(parsed.data.sessionId, parsed.data.content);
    return NextResponse.json({ ok: true, message }, { headers: corsHeaders() });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500, headers: corsHeaders() });
  }
}
