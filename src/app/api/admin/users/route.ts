import { ensureAdmin } from "@/lib/api-auth";
import { getClientIp, takeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, createdAt: true, updatedAt: true },
  });
  return NextResponse.json({ ok: true, users });
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const ip = getClientIp(req.headers);
  const limited = takeRateLimit(`admin_users_create:${ip}`, 20, 10 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ ok: false, message: "创建过于频繁，请稍后重试" }, { status: 429 });
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!/^[a-zA-Z0-9_-]{3,24}$/.test(username)) {
      return NextResponse.json({ ok: false, message: "用户名需为3-24位字母数字或_-组合" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ ok: false, message: "密码至少8位" }, { status: 400 });
    }
    const exists = await prisma.adminUser.findUnique({ where: { username } });
    if (exists) return NextResponse.json({ ok: false, message: "管理员已存在" }, { status: 400 });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.adminUser.create({
      data: { username, passwordHash },
      select: { id: true, username: true, createdAt: true, updatedAt: true },
    });
    return NextResponse.json({ ok: true, user });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "新增管理员失败";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const ip = getClientIp(req.headers);
  const limited = takeRateLimit(`admin_users_patch:${ip}`, 40, 10 * 60 * 1000);
  if (!limited.ok) return NextResponse.json({ ok: false, message: "操作过于频繁，请稍后重试" }, { status: 429 });
  try {
    const body = await req.json();
    const username = String(body.username || "").trim();
    const newPassword = String(body.newPassword || "");
    if (!username) return NextResponse.json({ ok: false, message: "缺少用户名" }, { status: 400 });
    if (newPassword.length < 8) return NextResponse.json({ ok: false, message: "新密码至少8位" }, { status: 400 });
    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) return NextResponse.json({ ok: false, message: "管理员不存在" }, { status: 404 });
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.adminUser.update({ where: { username }, data: { passwordHash } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "修改失败";
    return NextResponse.json({ ok: false, message: msg }, { status: 400 });
  }
}
