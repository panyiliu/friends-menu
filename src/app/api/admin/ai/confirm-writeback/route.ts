import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type Body = {
  dishUpdates?: Array<{ dishId: string; englishName: string }>;
  categoryUpdates?: Array<{ categoryId: string; englishName: string }>;
};

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ success: false, error: "未登录或无权限" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ success: false, error: "请求体必须是合法 JSON" }, { status: 400 });
  }

  const dishUpdates = Array.isArray(body?.dishUpdates)
    ? body.dishUpdates
        .map((x) => ({
          dishId: String(x?.dishId || "").trim(),
          englishName: String(x?.englishName ?? "").trim(),
        }))
        .filter((x) => x.dishId)
    : [];
  const categoryUpdates = Array.isArray(body?.categoryUpdates)
    ? body.categoryUpdates
        .map((x) => ({
          categoryId: String(x?.categoryId || "").trim(),
          englishName: String(x?.englishName ?? "").trim(),
        }))
        .filter((x) => x.categoryId)
    : [];

  if (dishUpdates.length === 0 && categoryUpdates.length === 0) {
    return NextResponse.json({ success: true, updatedDishCount: 0, updatedCategoryCount: 0 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of dishUpdates) {
        await tx.dish.update({
          where: { id: item.dishId },
          data: { englishName: item.englishName },
        });
      }
      for (const item of categoryUpdates) {
        await tx.category.update({
          where: { id: item.categoryId },
          data: { englishName: item.englishName },
        });
      }
    });
    return NextResponse.json({
      success: true,
      updatedDishCount: dishUpdates.length,
      updatedCategoryCount: categoryUpdates.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "确认写回失败";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

