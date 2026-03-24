import { setAdminSession } from "@/lib/auth";
import { logError, logWarn } from "@/lib/logger";
import { getClientIp, takeRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req.headers);
    const ipLimiter = takeRateLimit(`login:ip:${ip}`, 12, 5 * 60 * 1000);
    if (!ipLimiter.ok) {
      await logWarn("login_rate_limited_by_ip", { ip });
      return NextResponse.json({ ok: false, message: "尝试次数过多，请稍后再试" }, { status: 429 });
    }
    const { username, password } = await req.json();
    const accountLimiter = takeRateLimit(`login:user:${String(username || "")}:${ip}`, 8, 5 * 60 * 1000);
    if (!accountLimiter.ok) {
      await logWarn("login_rate_limited_by_user", { ip, username });
      return NextResponse.json({ ok: false, message: "尝试次数过多，请稍后再试" }, { status: 429 });
    }
    const user = await prisma.adminUser.findUnique({ where: { username } });
    if (!user) return NextResponse.json({ ok: false, message: "账号或密码错误" }, { status: 401 });
    const pass = await bcrypt.compare(password || "", user.passwordHash);
    if (!pass) return NextResponse.json({ ok: false, message: "账号或密码错误" }, { status: 401 });

    if (process.env.NODE_ENV === "production" && user.username === "admin") {
      const usingDefault = await bcrypt.compare("admin123456", user.passwordHash);
      if (usingDefault) {
        await logWarn("default_admin_password_blocked", { ip, username: user.username });
        return NextResponse.json({ ok: false, message: "生产环境禁止默认密码，请先修改后台密码" }, { status: 403 });
      }
    }

    await setAdminSession(user.username);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "后台登录失败";
    await logError("admin_login_failed", error);
    return NextResponse.json(
      {
        ok: false,
        message: `后台登录失败：${msg}`,
      },
      { status: 500 },
    );
  }
}
