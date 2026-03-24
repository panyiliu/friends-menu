import { setAdminSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) return NextResponse.json({ ok: false, message: "账号或密码错误" }, { status: 401 });
    const pass = await bcrypt.compare(password || "", user.passwordHash);
    if (!pass) return NextResponse.json({ ok: false, message: "账号或密码错误" }, { status: 401 });
    await setAdminSession(user.username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "后台登录失败";
    return NextResponse.json(
      {
        ok: false,
        message: `后台登录失败：${msg}`,
      },
      { status: 500 },
    );
  }
}
