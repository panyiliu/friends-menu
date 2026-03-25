-- Add global debug UI toggle in system settings.
ALTER TABLE "SystemSetting" ADD COLUMN "debugUiEnabled" BOOLEAN NOT NULL DEFAULT false;
