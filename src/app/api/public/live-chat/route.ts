import { NextResponse, type NextRequest } from "next/server";
import { sendCustomerChatMessageSchema, trackRequestSchema } from "@/lib/validation/public-support";
import { sendCustomerLiveChatMessage, listPublicLiveChatThread } from "@/lib/services/live-chat.service";
import { checkRateLimit } from "@/lib/api/rate-limit";

// Open like /api/public/presence — reached directly from the browser on
// both this app's own /help page and the standalone customer app's page
// (cross-origin). The (ticketNumber, email) pair is the actual auth here,
// same shared-secret pattern the public tracker itself already relies on —
// not gated by PUBLIC_API_KEY like the server-to-server ticket-creation
// bridge, since there's no server on the customer app's side making this
// specific call, the visitor's own browser is.
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

export async function GET(request: NextRequest) {
  const ip = clientIp(request);
  if (!checkRateLimit("help-chat-poll", ip, 120)) {
    return NextResponse.json({ ok: false }, { status: 429, headers: corsHeaders() });
  }

  const { searchParams } = new URL(request.url);
  const parsed = trackRequestSchema.safeParse({ ticketNumber: searchParams.get("ticketNumber"), email: searchParams.get("email") });
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400, headers: corsHeaders() });

  const messages = await listPublicLiveChatThread(parsed.data.ticketNumber, parsed.data.email);
  if (!messages) return NextResponse.json({ ok: false }, { status: 404, headers: corsHeaders() });
  return NextResponse.json({ ok: true, messages }, { headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (!checkRateLimit("help-chat-send", ip, 30)) {
    return NextResponse.json({ ok: false, error: "Too many messages — please slow down." }, { status: 429, headers: corsHeaders() });
  }

  try {
    const body = await request.json();
    const parsed = sendCustomerChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Check your message and try again." }, { status: 400, headers: corsHeaders() });
    }

    const message = await sendCustomerLiveChatMessage(parsed.data);
    if (!message) return NextResponse.json({ ok: false, error: "We couldn't find a request matching that reference number and email." }, { status: 404, headers: corsHeaders() });
    return NextResponse.json({ ok: true, message }, { headers: corsHeaders() });
  } catch {
    return NextResponse.json({ ok: false, error: "Something went wrong. Please try again." }, { status: 500, headers: corsHeaders() });
  }
}
