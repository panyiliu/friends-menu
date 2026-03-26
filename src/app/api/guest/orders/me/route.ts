import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const guestId = req.nextUrl.searchParams.get("guestId");
  if (!token || !guestId) return NextResponse.json({ ok: false }, { status: 400 });

  const invite = await prisma.inviteLink.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ ok: false }, { status: 403 });

  const orders = await prisma.order.findMany({
    where: { guestId, inviteId: invite.id },
    orderBy: { createdAt: "desc" },
    include: { items: { include: { dish: { include: { category: true } } } } },
  });

  return NextResponse.json({ ok: true, orders });
}
