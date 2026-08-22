import { NextResponse, type NextRequest } from "next/server";
import { listPublicBusinessUnits } from "@/lib/services/public-support.service";
import { checkRateLimit } from "@/lib/api/rate-limit";

/**
 * Server-to-server bridge for the standalone customer Help & Support app
 * to read the live business-unit list — same set as the CRM's own /help
 * form's "Which service is this about?" picker, kept live instead of
 * hardcoded so an admin creating/deleting a business unit in
 * /admin/business-units takes effect on both apps immediately, no deploy.
 * Protected by the same shared secret (x-api-key) as
 * /api/public/support-requests; keep PUBLIC_API_KEY server-side only in
 * the customer app.
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-api-key");
  if (!apiKey || !process.env.PUBLIC_API_KEY || apiKey !== process.env.PUBLIC_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (!checkRateLimit("bridge-business-units", ip, 60)) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }

  const businessUnits = await listPublicBusinessUnits();
  return NextResponse.json({ businessUnits: businessUnits.map((bu) => ({ id: bu.id, code: bu.code, name: bu.name })) });
}
