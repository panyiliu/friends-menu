import { ensureAdmin } from "@/lib/api-auth";
import { logInfo, logWarn } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function normalizeSingleTag(input: unknown) {
  return String(input || "")
    .split(",")[0]
    ?.trim() || "";
}

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const data = await prisma.dish.findMany({
    orderBy: { createdAt: "desc" },
    include: { category: true, images: true },
  });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();

  if (body.mode === "cleanup-unused-tags") {
    // “无效标签”定义：当前没有任何可点菜品使用的标签。
    // 清理策略：只从“不可点菜品”里移除这些标签，避免误伤正在可点菜品的标签。
    const availableDishes = await prisma.dish.findMany({
      where: { isAvailable: true },
      select: { tags: true },
    });
    const availableTagSet = new Set(
      availableDishes
        .map((d) => normalizeSingleTag(d.tags))
        .map((t) => t.trim())
        .filter(Boolean),
    );

    const availableTags = Array.from(availableTagSet);
    const where = availableTags.length
      ? { isAvailable: false, tags: { notIn: availableTags, not: "" } }
      : { isAvailable: false, tags: { not: "" } };

    const result = await prisma.dish.updateMany({
      where,
      data: { tags: "" },
    });

    return NextResponse.json({ ok: true, clearedCount: result.count });
  }

  if (body.mode === "purge-all") {
    const confirmText = String(body.confirmText || "");
    if (confirmText !== "DELETE ALL DISHES") {
      return NextResponse.json({ ok: false, message: "确认词不正确，操作已取消" }, { status: 400 });
    }
    await logWarn("admin_dishes_purge_all_requested", {});
    const result = await prisma.$transaction(async (tx) => {
      const imageDeleted = await tx.dishImage.deleteMany({});
      const orderItemDeleted = await tx.orderItem.deleteMany({});
      const dishDeleted = await tx.dish.deleteMany({});
      return {
        imageDeleted: imageDeleted.count,
        orderItemDeleted: orderItemDeleted.count,
        dishDeleted: dishDeleted.count,
      };
    });
    await logInfo("admin_dishes_purge_all_completed", result);
    return NextResponse.json({ ok: true, ...result });
  }

  try {
    const data = await prisma.dish.create({
      data: {
        name: body.name,
        englishName: body.englishName || "",
        tags: normalizeSingleTag(body.tags),
        description: body.description || "",
        method: body.method || "",
        ingredients: body.ingredients || "",
        seasonings: body.seasonings || "",
        price: Number(body.price || 0),
        categoryId: body.categoryId,
        isPublished: true,
        isAvailable: true,
        images: body.imageUrl ? { create: [{ url: body.imageUrl, isCover: true }] } : undefined,
      },
    });
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "新增菜品失败";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  if (body.imageAction === "replace" && body.imageUrl) {
    await prisma.dishImage.deleteMany({ where: { dishId: body.id } });
    await prisma.dishImage.create({ data: { dishId: body.id, url: body.imageUrl, isCover: true } });
  }
  const data = await prisma.dish.update({
    where: { id: body.id },
    data: {
      name: body.name,
      englishName: body.englishName || "",
      tags: normalizeSingleTag(body.tags),
      description: body.description || "",
      method: body.method || "",
      ingredients: body.ingredients || "",
      seasonings: body.seasonings || "",
      price: Number(body.price || 0),
      categoryId: body.categoryId,
      isPublished: Boolean(body.isPublished),
      isAvailable: Boolean(body.isAvailable),
    },
  });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  const imageId = req.nextUrl.searchParams.get("imageId");
  if (imageId) {
    await prisma.dishImage.delete({ where: { id: imageId } });
    return NextResponse.json({ ok: true });
  }
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    await prisma.dishImage.deleteMany({ where: { dishId: id } });
    await prisma.dish.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "删除失败：该菜品可能已被订单引用，请先删除相关订单再试" }, { status: 400 });
  }
}
