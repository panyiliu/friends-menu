import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  let setting = await prisma.systemSetting.findFirst();
  if (!setting) setting = await prisma.systemSetting.create({ data: {} });
  return NextResponse.json({ ok: true, setting });
}

export async function PUT(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  try {
    const body = await req.json();
    let setting = await prisma.systemSetting.findFirst();
    if (!setting) setting = await prisma.systemSetting.create({ data: {} });
    const fullData = {
      adminTitle: body.adminTitle || "点餐系统",
      guestTitle: body.guestTitle || "朋友·聚",
      guestSubtitle: body.guestSubtitle || "欢聚时刻 · 臻选风味",
      guestBannerUrl: body.guestBannerUrl || "",
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
    return NextResponse.json({ ok: false, message: `系统设置保存失败：${msg}` }, { status: 400 });
  }
}
