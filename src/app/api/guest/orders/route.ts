import { prisma } from "@/lib/prisma";
import { sendNewOrderEmail } from "@/lib/mailer";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  token: z.string().min(6),
  guestId: z.string().optional().default(""),
  guestName: z.string().max(20).optional().default(""),
  note: z.string().max(200).optional().default(""),
  eta: z.string().max(60).optional().default(""),
  items: z.array(z.object({ dishId: z.string(), quantity: z.number().int().positive() })).min(1),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "参数错误" }, { status: 400 });
  }
  const { token, guestId, guestName, note, eta, items } = parsed.data;
  const invite = await prisma.inviteLink.findUnique({ where: { token } });
  const now = new Date();
  if (!invite || !invite.isActive || (invite.expiresAt && invite.expiresAt < now)) {
    return NextResponse.json({ ok: false, message: "链接无效或已过期" }, { status: 403 });
  }

  const dishIds = items.map((i) => i.dishId);
  const dishes = await prisma.dish.findMany({ where: { id: { in: dishIds }, isAvailable: true, isPublished: true } });
  if (dishes.length !== dishIds.length) {
    return NextResponse.json({ ok: false, message: "存在不可点菜品，请刷新后重试" }, { status: 400 });
  }

  const resolvedGuestName = String(invite.inviteGuestName || guestName || invite.label || "朋友").trim().slice(0, 20) || "朋友";

  let guest = null as null | { id: string; name: string };
  const normalizedGuestId = String(guestId || "").trim();
  if (normalizedGuestId) {
    guest = await prisma.guestProfile.findUnique({ where: { id: normalizedGuestId } });
  }
  if (!guest) {
    guest = await prisma.guestProfile.create({ data: { name: resolvedGuestName } });
  }
  const order = await prisma.order.create({
    data: {
      inviteId: invite.id,
      guestId: guest.id,
      note,
      eta,
      items: { create: items.map((i) => ({ dishId: i.dishId, quantity: i.quantity })) },
    },
    include: { items: true },
  });
  try {
    await sendNewOrderEmail({
      guestName: resolvedGuestName,
      createdAt: order.createdAt,
      note,
      items: items.map((i) => ({ name: dishes.find((d) => d.id === i.dishId)?.name || "未知菜品", quantity: i.quantity })),
    });
  } catch (error) {
    console.error("send mail failed:", error instanceof Error ? error.message : error);
  }
  return NextResponse.json({ ok: true, orderId: order.id, guestId: guest.id });
}

const deleteSchema = z.object({
  token: z.string().min(6),
  guestId: z.string().min(1),
  orderId: z.string().min(1),
});

export async function DELETE(req: Request) {
  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "参数错误" }, { status: 400 });
  }
  const { token, guestId, orderId } = parsed.data;

  const invite = await prisma.inviteLink.findUnique({ where: { token } });
  if (!invite) return NextResponse.json({ ok: false, message: "链接无效" }, { status: 403 });

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.inviteId !== invite.id || order.guestId !== guestId) {
    return NextResponse.json({ ok: false, message: "订单不存在或无权限" }, { status: 404 });
  }

  await prisma.order.delete({ where: { id: orderId } });
  return NextResponse.json({ ok: true });
}
