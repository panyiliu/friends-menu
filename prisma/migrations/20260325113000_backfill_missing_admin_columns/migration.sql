-- Backfill missing columns that are already referenced by current runtime code.
-- This migration is idempotent in normal Prisma flow (runs once via _prisma_migrations).

-- InviteLink additions
ALTER TABLE "InviteLink" ADD COLUMN "label" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InviteLink" ADD COLUMN "inviteGuestName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "InviteLink" ADD COLUMN "showPrice" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "InviteLink" ADD COLUMN "welcomeEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "InviteLink" ADD COLUMN "welcomeTitle" TEXT NOT NULL DEFAULT '欢迎光临';
ALTER TABLE "InviteLink" ADD COLUMN "welcomeSubtitle" TEXT NOT NULL DEFAULT '请开始点餐';
ALTER TABLE "InviteLink" ADD COLUMN "welcomeButtonText" TEXT NOT NULL DEFAULT '开始点餐';
ALTER TABLE "InviteLink" ADD COLUMN "welcomeFontSize" TEXT NOT NULL DEFAULT 'md';
ALTER TABLE "InviteLink" ADD COLUMN "welcomeFontWeight" TEXT NOT NULL DEFAULT 'semibold';
ALTER TABLE "InviteLink" ADD COLUMN "welcomeTextAlign" TEXT NOT NULL DEFAULT 'center';
ALTER TABLE "InviteLink" ADD COLUMN "welcomeButtonColor" TEXT NOT NULL DEFAULT '#111827';
ALTER TABLE "InviteLink" ADD COLUMN "welcomeBackdropOpacity" INTEGER NOT NULL DEFAULT 35;

-- SystemSetting additions
ALTER TABLE "SystemSetting" ADD COLUMN "guestTitle" TEXT NOT NULL DEFAULT '朋友·聚';
ALTER TABLE "SystemSetting" ADD COLUMN "guestSubtitle" TEXT NOT NULL DEFAULT '欢聚时刻 · 臻选风味';
ALTER TABLE "SystemSetting" ADD COLUMN "guestBannerUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "SystemSetting" ADD COLUMN "welcomeAlwaysShow" BOOLEAN NOT NULL DEFAULT false;

-- Order additions used by current schema and APIs
ALTER TABLE "Order" ADD COLUMN "inviteId" TEXT;
ALTER TABLE "Order" ADD COLUMN "eta" TEXT NOT NULL DEFAULT '';
