import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";

type MailConfig = {
  sender: string;
  password: string;
  receiver: string;
  host: string;
  port: number;
};
type MailConfigInput = {
  emailEnabled?: boolean;
  emailSender?: string | null;
  emailPassword?: string | null;
  emailReceiver?: string | null;
  smtpServer?: string | null;
  smtpPort?: number | null;
};

function parseError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err || "");
  if (message.includes("Invalid login") || message.includes("535")) return "SMTP认证失败，请检查发件邮箱或授权码。";
  if (message.includes("ECONNREFUSED") || message.includes("ETIMEDOUT")) return "SMTP连接失败，请检查服务器地址、端口或网络。";
  return `邮件发送失败：${message}`;
}

async function getMailConfig(
  overrides?: MailConfigInput,
  opts?: { allowWhenEmailDisabled?: boolean },
): Promise<{ ok: true; config: MailConfig } | { ok: false; message: string }> {
  const setting = await prisma.systemSetting.findFirst();
  const mergedEnabled = typeof overrides?.emailEnabled === "boolean" ? overrides.emailEnabled : setting?.emailEnabled;
  if (!mergedEnabled && !opts?.allowWhenEmailDisabled) return { ok: false, message: "邮件提醒未启用，请先勾选“启用邮件提醒”。" };
  const sender = overrides?.emailSender || setting?.emailSender || process.env.SMTP_SENDER;
  const password = overrides?.emailPassword || setting?.emailPassword || process.env.SMTP_PASSWORD;
  const receiver = overrides?.emailReceiver || setting?.emailReceiver || process.env.SMTP_RECEIVER;
  const host = overrides?.smtpServer || setting?.smtpServer || process.env.SMTP_SERVER || "smtp.qq.com";
  const port = Number(overrides?.smtpPort || setting?.smtpPort || process.env.SMTP_PORT || 587);
  if (!sender) return { ok: false, message: "缺少发件邮箱(sender)。" };
  if (!password) return { ok: false, message: "缺少授权码(password)。" };
  if (!receiver) return { ok: false, message: "缺少收件邮箱(receiver)。" };
  return { ok: true, config: { sender, password, receiver, host, port } };
}

export async function sendTestEmail(overrides?: MailConfigInput) {
  const cfg = await getMailConfig(overrides, { allowWhenEmailDisabled: true });
  if (!cfg.ok) return { ok: false, message: cfg.message };
  try {
    const transport = nodemailer.createTransport({
      host: cfg.config.host,
      port: cfg.config.port,
      secure: false,
      auth: { user: cfg.config.sender, pass: cfg.config.password },
    });
    await transport.sendMail({
      from: cfg.config.sender,
      to: cfg.config.receiver,
      subject: "点餐系统测试邮件",
      text: `测试时间：${new Date().toLocaleString()}\n状态：邮件服务可用`,
    });
    return { ok: true, message: "测试邮件发送成功，请检查收件箱。" };
  } catch (err) {
    return { ok: false, message: parseError(err) };
  }
}

export async function sendNewOrderEmail(input: {
  guestName: string;
  createdAt: Date;
  note: string;
  items: { name: string; quantity: number }[];
}) {
  const cfg = await getMailConfig();
  if (!cfg.ok) throw new Error(cfg.message);

  const transport = nodemailer.createTransport({
    host: cfg.config.host,
    port: cfg.config.port,
    secure: false,
    auth: { user: cfg.config.sender, pass: cfg.config.password },
  });

  const itemText = input.items.map((i) => `${i.name} x${i.quantity}`).join("\n");
  try {
    await transport.sendMail({
      from: cfg.config.sender,
      to: cfg.config.receiver,
      subject: `新点餐通知 - ${input.guestName}`,
      text: `点餐人：${input.guestName}\n下单时间：${input.createdAt.toLocaleString()}\n菜品：\n${itemText}\n备注：${input.note || "-"}`,
    });
  } catch (err) {
    throw new Error(parseError(err));
  }
}
