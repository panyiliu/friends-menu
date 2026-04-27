import { ensureAdmin } from "@/lib/api-auth";
import { normalizeUploadUrl } from "@/lib/image-variants";
import { logError } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function schemaHint(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error || "");
  if (msg.includes("Unknown argument") || msg.includes("column") || msg.includes("does not exist") || msg.includes("P2022")) {
    return "数据库结构与当前代码不一致，请在服务器执行：docker compose exec app npx prisma migrate deploy";
  }
  return "";
}

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    let setting = await prisma.systemSetting.findFirst();
    if (!setting) setting = await prisma.systemSetting.create({ data: {} });
    return NextResponse.json({
      ok: true,
      setting: {
        ...setting,
        guestBannerUrl: normalizeUploadUrl(setting.guestBannerUrl || ""),
      },
    });
  } catch (error) {
    await logError("admin_settings_get_failed", error);
    return NextResponse.json({ ok: false, message: schemaHint(error) || "系统设置读取失败" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const body = await req.json();
    let setting = await prisma.systemSetting.findFirst();
    if (!setting) setting = await prisma.systemSetting.create({ data: {} });
    const fullData = {
      debugUiEnabled: Boolean(body.debugUiEnabled),
      adminTitle: body.adminTitle || "点餐系统",
      guestTitle: body.guestTitle || "朋友·聚",
      guestSubtitle: body.guestSubtitle || "欢聚时刻 · 臻选风味",
      guestBannerUrl: normalizeUploadUrl(body.guestBannerUrl || ""),
      welcomeAlwaysShow: Boolean(body.welcomeAlwaysShow),
      refreshIntervalSec: Number(body.refreshIntervalSec || 8),
      emailEnabled: Boolean(body.emailEnabled),
      emailSender: body.emailSender || null,
      emailPassword: body.emailPassword || null,
      emailReceiver: body.emailReceiver || null,
      smtpServer: body.smtpServer || "smtp.qq.com",
      smtpPort: Number(body.smtpPort || 587),
    };

    let updated;
    try {
      updated = await prisma.systemSetting.update({
        where: { id: setting.id },
        data: fullData,
      });
    } catch (error) {
      // Dev hot-reload may temporarily hold an old Prisma client. Fallback to old fields only.
      const msg = error instanceof Error ? error.message : "";
      if (!msg.includes("Unknown argument `guestTitle`")) throw error;
      updated = await prisma.systemSetting.update({
        where: { id: setting.id },
        data: {
          adminTitle: fullData.adminTitle,
          refreshIntervalSec: fullData.refreshIntervalSec,
          emailEnabled: fullData.emailEnabled,
          emailSender: fullData.emailSender,
          emailPassword: fullData.emailPassword,
          emailReceiver: fullData.emailReceiver,
          smtpServer: fullData.smtpServer,
          smtpPort: fullData.smtpPort,
        },
      });
    }
    return NextResponse.json({ ok: true, setting: updated });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "系统设置保存失败";
    await logError("admin_settings_put_failed", error);
    const hint = schemaHint(error);
    return NextResponse.json({ ok: false, message: hint || `系统设置保存失败：${msg}` }, { status: 400 });
  }
}
