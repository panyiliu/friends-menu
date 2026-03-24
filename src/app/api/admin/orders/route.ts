import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const name = req.nextUrl.searchParams.get("name") || undefined;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const status = req.nextUrl.searchParams.get("status") || undefined;
  try {
    const data = await prisma.order.findMany({
      where: {
        guest: name ? { name: { contains: name } } : undefined,
        createdAt: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
        status: status as "PENDING" | "PREPARING" | "DONE" | undefined,
      },
      include: { guest: true, items: { include: { dish: { include: { images: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    // Handle legacy status text left from older schema versions.
    await prisma.$executeRawUnsafe(`UPDATE "Order" SET "status"='PENDING' WHERE "status" IN ('待备餐','pending')`);
    await prisma.$executeRawUnsafe(`UPDATE "Order" SET "status"='PREPARING' WHERE "status" IN ('备餐中','preparing')`);
    await prisma.$executeRawUnsafe(`UPDATE "Order" SET "status"='DONE' WHERE "status" IN ('已完成','done')`);
    try {
      const data = await prisma.order.findMany({
        where: {
          guest: name ? { name: { contains: name } } : undefined,
          createdAt: from || to ? { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } : undefined,
          status: status as "PENDING" | "PREPARING" | "DONE" | undefined,
        },
        include: { guest: true, items: { include: { dish: { include: { images: true } } } } },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ ok: true, data });
    } catch {
      console.error("orders route failed:", error);
      return NextResponse.json({ ok: false, message: "订单数据读取失败，请稍后重试" }, { status: 500 });
    }
  }
}

export async function PATCH(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const id = String(body.id || "");
  const status = String(body.status || "");
  if (!id || !["PENDING", "PREPARING", "DONE"].includes(status)) {
    return NextResponse.json({ ok: false, message: "参数错误" }, { status: 400 });
  }
  const data = await prisma.order.update({
    where: { id },
    data: { status: status as "PENDING" | "PREPARING" | "DONE" },
  });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const ids = Array.isArray(body.ids) ? body.ids.map((x: unknown) => String(x)).filter(Boolean) : [];
  if (ids.length === 0) {
    return NextResponse.json({ ok: false, message: "缺少待删除订单ID" }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.orderItem.deleteMany({ where: { orderId: { in: ids } } });
    const deleted = await tx.order.deleteMany({ where: { id: { in: ids } } });
    return deleted.count;
  });

  return NextResponse.json({ ok: true, deletedCount: result });
}
