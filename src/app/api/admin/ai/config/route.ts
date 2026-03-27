import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const SINGLETON_ADMIN_ID = "singleton-admin";

function maskApiKey(apiKey: string | null | undefined) {
  if (!apiKey) return "";
  const trimmed = apiKey.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "****";
  return `${trimmed.slice(0, 4)}****`;
}

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ success: false, error: "未登录或无权限" }, { status: 401 });
  }

  const config = await prisma.aiUserConfig.findUnique({
    where: { adminUserId: SINGLETON_ADMIN_ID },
  });

  if (!config) {
    return NextResponse.json({ success: true, data: null });
  }

  return NextResponse.json({
    success: true,
    data: {
      provider: config.provider,
      model: config.model,
      apiKeyMasked: maskApiKey(config.apiKey),
      promptGenerateDishEnInfo: config.promptGenerateDishEnInfo,
      enabled: config.enabled,
    },
  });
}

type PutBody = {
  provider: string;
  model: string;
  apiKey?: string;
  promptGenerateDishEnInfo?: string;
  enabled?: boolean;
};

export async function PUT(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ success: false, error: "未登录或无权限" }, { status: 401 });
  }

  let body: PutBody;
  try {
    body = (await req.json()) as PutBody;
  } catch {
    return NextResponse.json({ success: false, error: "请求体必须是合法 JSON" }, { status: 400 });
  }

  const provider = String(body.provider || "").trim();
  const model = String(body.model || "").trim();
  if (!provider || !model) {
    return NextResponse.json({ success: false, error: "provider 与 model 不能为空" }, { status: 400 });
  }

  const prompt = String(body.promptGenerateDishEnInfo || "").slice(0, 4000);
  const enabled = body.enabled ?? true;
  const apiKeyInput = typeof body.apiKey === "string" ? body.apiKey.trim() : undefined;

  const existing = await prisma.aiUserConfig.findUnique({
    where: { adminUserId: SINGLETON_ADMIN_ID },
  });

  if (!existing) {
    if (!apiKeyInput) {
      return NextResponse.json({ success: false, error: "首次配置必须提供 apiKey" }, { status: 400 });
    }
    await prisma.aiUserConfig.create({
      data: {
        adminUserId: SINGLETON_ADMIN_ID,
        provider,
        model,
        apiKey: apiKeyInput,
        promptGenerateDishEnInfo: prompt,
        enabled,
      },
    });
  } else {
    await prisma.aiUserConfig.update({
      where: { adminUserId: SINGLETON_ADMIN_ID },
      data: {
        provider,
        model,
        apiKey: apiKeyInput && apiKeyInput.length > 0 ? apiKeyInput : existing.apiKey,
        promptGenerateDishEnInfo: prompt,
        enabled,
      },
    });
  }

  return NextResponse.json({ success: true });
}

