import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { customAlphabet } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 12);

function normalizeWelcomeTemplate(input: Record<string, unknown>) {
  const fontSize = String(input.welcomeFontSize || "md");
  const fontWeight = String(input.welcomeFontWeight || "semibold");
  const textAlign = String(input.welcomeTextAlign || "center");
  const backdrop = Number(input.welcomeBackdropOpacity ?? 35);

  return {
    welcomeEnabled: input.welcomeEnabled === undefined ? undefined : Boolean(input.welcomeEnabled),
    welcomeTitle: input.welcomeTitle === undefined ? undefined : String(input.welcomeTitle || "欢迎光临"),
    welcomeSubtitle: input.welcomeSubtitle === undefined ? undefined : String(input.welcomeSubtitle || "请开始点餐"),
    welcomeButtonText: input.welcomeButtonText === undefined ? undefined : String(input.welcomeButtonText || "开始点餐"),
    welcomeFontSize: ["sm", "md", "lg"].includes(fontSize) ? fontSize : "md",
    welcomeFontWeight: ["normal", "medium", "semibold", "bold"].includes(fontWeight) ? fontWeight : "semibold",
    welcomeTextAlign: ["left", "center", "right"].includes(textAlign) ? textAlign : "center",
    welcomeButtonColor: input.welcomeButtonColor === undefined ? undefined : String(input.welcomeButtonColor || "#111827"),
    welcomeBackdropOpacity: Number.isFinite(backdrop) ? Math.max(0, Math.min(80, Math.round(backdrop))) : 35,
  };
}

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const setting = await prisma.systemSetting.findFirst();
  const active = setting?.activeInviteId
    ? await prisma.inviteLink.findUnique({ where: { id: setting.activeInviteId } })
    : null;
  const links = await prisma.inviteLink.findMany({ orderBy: { createdAt: "desc" } });
  const now = new Date();
  return NextResponse.json({
    ok: true,
    active,
    links: links.map((x) => ({
      ...x,
      isExpired: Boolean(x.expiresAt && x.expiresAt < now),
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!ensureAdmin(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const body = await req.json();
  const mode = body.mode as "reset" | "update" | "create" | "setActive" | "delete";

  let setting = await prisma.systemSetting.findFirst();
  if (!setting) {
    setting = await prisma.systemSetting.create({ data: {} });
  }

  if (mode === "reset") {
    const tpl = normalizeWelcomeTemplate(body || {});
    if (setting.activeInviteId) {
      await prisma.inviteLink.update({ where: { id: setting.activeInviteId }, data: { isActive: false } });
    }
    const created = await prisma.inviteLink.create({
      data: {
        token: nanoid(),
        isActive: true,
        inviteGuestName: String(body.inviteGuestName || ""),
        showPrice: Boolean(body.showPrice ?? false),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        welcomeEnabled: tpl.welcomeEnabled ?? true,
        welcomeTitle: tpl.welcomeTitle ?? "欢迎光临",
        welcomeSubtitle: tpl.welcomeSubtitle ?? "请开始点餐",
        welcomeButtonText: tpl.welcomeButtonText ?? "开始点餐",
        welcomeFontSize: tpl.welcomeFontSize,
        welcomeFontWeight: tpl.welcomeFontWeight,
        welcomeTextAlign: tpl.welcomeTextAlign,
        welcomeButtonColor: tpl.welcomeButtonColor ?? "#111827",
        welcomeBackdropOpacity: tpl.welcomeBackdropOpacity,
      },
    });
    await prisma.systemSetting.update({ where: { id: setting.id }, data: { activeInviteId: created.id } });
    return NextResponse.json({ ok: true, active: created });
  }

  if (mode === "create") {
    const tpl = normalizeWelcomeTemplate(body || {});
    const created = await prisma.inviteLink.create({
      data: {
        token: nanoid(),
        label: String(body.label || ""),
        inviteGuestName: String(body.inviteGuestName || ""),
        isActive: Boolean(body.isActive ?? true),
        showPrice: Boolean(body.showPrice ?? false),
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        welcomeEnabled: tpl.welcomeEnabled ?? true,
        welcomeTitle: tpl.welcomeTitle ?? "欢迎光临",
        welcomeSubtitle: tpl.welcomeSubtitle ?? "请开始点餐",
        welcomeButtonText: tpl.welcomeButtonText ?? "开始点餐",
        welcomeFontSize: tpl.welcomeFontSize,
        welcomeFontWeight: tpl.welcomeFontWeight,
        welcomeTextAlign: tpl.welcomeTextAlign,
        welcomeButtonColor: tpl.welcomeButtonColor ?? "#111827",
        welcomeBackdropOpacity: tpl.welcomeBackdropOpacity,
      },
    });
    if (body.setAsActive === true) {
      await prisma.systemSetting.update({ where: { id: setting.id }, data: { activeInviteId: created.id } });
    }
    return NextResponse.json({ ok: true, created });
  }

  if (mode === "setActive") {
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ ok: false, message: "缺少链接ID" }, { status: 400 });
    const exists = await prisma.inviteLink.findUnique({ where: { id } });
    if (!exists) return NextResponse.json({ ok: false, message: "链接不存在" }, { status: 404 });
    await prisma.systemSetting.update({ where: { id: setting.id }, data: { activeInviteId: id } });
    return NextResponse.json({ ok: true });
  }

  if (mode === "delete") {
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ ok: false, message: "缺少链接ID" }, { status: 400 });
    if (setting.activeInviteId === id) return NextResponse.json({ ok: false, message: "当前主链接不能删除" }, { status: 400 });
    await prisma.inviteLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }

  if (setting.activeInviteId) {
    const tpl = normalizeWelcomeTemplate(body || {});
    const updated = await prisma.inviteLink.update({
      where: { id: String(body.id || setting.activeInviteId) },
      data: {
        label: body.label !== undefined ? String(body.label || "") : undefined,
        inviteGuestName: body.inviteGuestName !== undefined ? String(body.inviteGuestName || "") : undefined,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        isActive: body.isActive === undefined ? undefined : Boolean(body.isActive),
        showPrice: body.showPrice === undefined ? undefined : Boolean(body.showPrice),
        welcomeEnabled: tpl.welcomeEnabled,
        welcomeTitle: tpl.welcomeTitle,
        welcomeSubtitle: tpl.welcomeSubtitle,
        welcomeButtonText: tpl.welcomeButtonText,
        welcomeFontSize: body.welcomeFontSize === undefined ? undefined : tpl.welcomeFontSize,
        welcomeFontWeight: body.welcomeFontWeight === undefined ? undefined : tpl.welcomeFontWeight,
        welcomeTextAlign: body.welcomeTextAlign === undefined ? undefined : tpl.welcomeTextAlign,
        welcomeButtonColor: tpl.welcomeButtonColor,
        welcomeBackdropOpacity: body.welcomeBackdropOpacity === undefined ? undefined : tpl.welcomeBackdropOpacity,
      },
    });
    return NextResponse.json({ ok: true, active: updated });
  }

  return NextResponse.json({ ok: false, message: "无可更新链接" }, { status: 400 });
}
