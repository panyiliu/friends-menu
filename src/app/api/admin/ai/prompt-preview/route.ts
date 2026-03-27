import { getSystemPromptForGenerateDishEnInfo, mergePrompts } from "@/lib/ai/execute";
import { ensureAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const SINGLETON_ADMIN_ID = "singleton-admin";

export async function GET(req: NextRequest) {
  if (!ensureAdmin(req)) {
    return NextResponse.json({ success: false, error: "未登录或无权限" }, { status: 401 });
  }

  const config = await prisma.aiUserConfig.findUnique({
    where: { adminUserId: SINGLETON_ADMIN_ID },
  });

  const systemPrompt = getSystemPromptForGenerateDishEnInfo();
  const userPrompt = config?.promptGenerateDishEnInfo || "";
  const mergedPrompt = mergePrompts(systemPrompt, userPrompt);

  return NextResponse.json({
    success: true,
    data: {
      systemPrompt,
      userPrompt,
      mergedPrompt,
    },
  });
}

