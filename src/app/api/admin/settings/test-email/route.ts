import { ensureAdmin } from "@/lib/api-auth";
import { sendTestEmail } from "@/lib/mailer";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const result = await sendTestEmail({
    emailEnabled: Boolean(body.emailEnabled),
    emailSender: String(body.emailSender || ""),
    emailPassword: String(body.emailPassword || ""),
    emailReceiver: String(body.emailReceiver || ""),
    smtpServer: String(body.smtpServer || ""),
    smtpPort: Number(body.smtpPort || 587),
  });
  return NextResponse.json(result);
}
