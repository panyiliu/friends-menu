import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const { oldPassword, newPassword } = await req.json();
  const user = await prisma.adminUser.findUnique({ where: { username: "admin" } });
  if (!user) return NextResponse.json({ ok: false }, { status: 404 });
  const ok = await bcrypt.compare(oldPassword || "", user.passwordHash);
  if (!ok) return NextResponse.json({ ok: false, message: "旧密码错误" }, { status: 400 });
  const passwordHash = await bcrypt.hash(newPassword || "", 10);
  await prisma.adminUser.update({ where: { username: "admin" }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
