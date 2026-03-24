import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const today = startOfDay(new Date());
  const todayOrders = await prisma.order.count({ where: { createdAt: { gte: today } } });
  const people = await prisma.guestProfile.count();
  const rankRaw = await prisma.orderItem.groupBy({
    by: ["dishId"],
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: "desc" } },
    take: 5,
  });
  const dishIds = rankRaw.map((r) => r.dishId);
  const dishes = await prisma.dish.findMany({ where: { id: { in: dishIds } } });
  const rank = rankRaw.map((r) => ({
    dishId: r.dishId,
    name: dishes.find((d) => d.id === r.dishId)?.name || "未知菜品",
    quantity: r._sum.quantity || 0,
  }));
  return NextResponse.json({ ok: true, todayOrders, people, rank });
}
