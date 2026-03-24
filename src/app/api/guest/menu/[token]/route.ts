import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await prisma.inviteLink.findUnique({ where: { token } });
  const now = new Date();
  if (!invite || !invite.isActive) {
    return NextResponse.json({ ok: false, message: "链接无效，请联系管理员获取新链接" }, { status: 403 });
  }
  if (invite.expiresAt && invite.expiresAt < now) {
    return NextResponse.json({ ok: false, message: "链接已过期，请联系管理员重新分享" }, { status: 403 });
  }

  const setting = await prisma.systemSetting.findFirst();
  const categoriesRaw = await prisma.category.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: "asc" },
    include: {
      dishes: {
        where: { isAvailable: true },
        include: { images: true },
        orderBy: [{ isAvailable: "desc" }, { createdAt: "desc" }],
      },
    },
  });
  const categories = categoriesRaw.filter((c) => (c.dishes || []).length > 0);

  const availableTags = [
    ...new Set(
      categories
        .flatMap((c) => c.dishes.filter((d) => d.isAvailable))
        .flatMap((d) => (d.tags || "").split(","))
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];

  return NextResponse.json({
    ok: true,
    categories,
    availableTags,
    showPrice: Boolean(invite.showPrice),
    inviteGuestName: invite.inviteGuestName || "",
    welcomeTemplate: {
      enabled: Boolean(invite.welcomeEnabled),
      title: invite.welcomeTitle || "欢迎光临",
      subtitle: invite.welcomeSubtitle || "请开始点餐",
      buttonText: invite.welcomeButtonText || "开始点餐",
      fontSize: invite.welcomeFontSize || "md",
      fontWeight: invite.welcomeFontWeight || "semibold",
      textAlign: invite.welcomeTextAlign || "center",
      buttonColor: invite.welcomeButtonColor || "#111827",
      backdropOpacity: Number.isFinite(Number(invite.welcomeBackdropOpacity))
        ? Math.max(0, Math.min(80, Math.round(Number(invite.welcomeBackdropOpacity))))
        : 35,
    },
    uiConfig: {
      guestTitle: setting?.guestTitle || "朋友·聚",
      guestSubtitle: setting?.guestSubtitle || "欢聚时刻 · 臻选风味",
      guestBannerUrl: setting?.guestBannerUrl || "",
      welcomeAlwaysShow: Boolean(setting?.welcomeAlwaysShow),
    },
  });
}
