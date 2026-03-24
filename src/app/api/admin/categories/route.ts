import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const data = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const data = await prisma.category.create({
    data: { name: body.name, sortOrder: Number(body.sortOrder || 0), isEnabled: true },
  });
  return NextResponse.json({ ok: true, data });
}

export async function PUT(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  if (body.mode === "reorder" && Array.isArray(body.ids)) {
    const ids = body.ids.map((x: unknown) => String(x));
    await prisma.$transaction(
      ids.map((id: string, idx: number) =>
        prisma.category.update({
          where: { id },
          data: { sortOrder: idx + 1 },
        }),
      ),
    );
    return NextResponse.json({ ok: true });
  }
  const data = await prisma.category.update({
    where: { id: body.id },
    data: { name: body.name, sortOrder: Number(body.sortOrder || 0), isEnabled: Boolean(body.isEnabled) },
  });
  return NextResponse.json({ ok: true, data });
}

export async function DELETE(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false, message: "缺少分类ID" }, { status: 400 });

  const used = await prisma.dish.count({ where: { categoryId: id } });
  if (used > 0) {
    return NextResponse.json({ ok: false, message: "该分类下仍有菜品，请先处理菜品" }, { status: 400 });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
