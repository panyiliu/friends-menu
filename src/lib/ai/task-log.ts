import { prisma } from "@/lib/prisma";

export async function createAiTaskLog(params: {
  adminUserId: string;
  functionCode: string;
  requestPayload: unknown;
  status?: string;
  responsePayload?: unknown;
  errorMessage?: string;
}) {
  return prisma.aiTaskLog.create({
    data: {
      adminUserId: params.adminUserId,
      functionCode: params.functionCode,
      requestPayload: JSON.stringify(params.requestPayload ?? {}),
      status: params.status || "PENDING",
      responsePayload: params.responsePayload ? JSON.stringify(params.responsePayload) : "",
      errorMessage: params.errorMessage || "",
      createdAt: new Date(),
    },
  });
}

export async function updateAiTaskLog(
  id: string,
  params: { status: string; responsePayload?: unknown; errorMessage?: string },
) {
  return prisma.aiTaskLog.update({
    where: { id },
    data: {
      status: params.status,
      responsePayload: params.responsePayload ? JSON.stringify(params.responsePayload) : "",
      errorMessage: params.errorMessage || "",
    },
  });
}

