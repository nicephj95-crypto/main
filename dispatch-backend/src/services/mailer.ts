import axios from "axios";
import { env } from "../config/env";

type PasswordResetMailParams = {
  to: string;
  token: string;
  expiresAt: Date;
};

function buildResetUrl(token: string) {
  if (!env.FRONTEND_BASE_URL) return null;
  const base = env.FRONTEND_BASE_URL.replace(/\/$/, "");
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

export async function sendPasswordResetEmail(
  params: PasswordResetMailParams
): Promise<{ sent: boolean; reason?: string }> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return { sent: false, reason: "RESEND_API_KEY 또는 RESEND_FROM_EMAIL 미설정" };
  }

  const resetUrl = buildResetUrl(params.token);
  const expiresLabel = params.expiresAt.toLocaleString("ko-KR", {
    hour12: false,
  });

  const subject = "[HM'US] 비밀번호 재설정 안내";
  const text = [
    "비밀번호 재설정 요청이 접수되었습니다.",
    "",
    resetUrl ? `재설정 링크: ${resetUrl}` : "관리자에게 문의해주세요.",
    `링크 만료 시각: ${expiresLabel}`,
    "",
    "본인이 요청하지 않았다면 이 메일을 무시해주세요.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.6; color:#222;">
      <h2 style="margin:0 0 12px;">비밀번호 재설정 안내</h2>
      <p style="margin:0 0 10px;">비밀번호 재설정 요청이 접수되었습니다.</p>
      ${
        resetUrl
          ? `<p style="margin:0 0 10px;"><a href="${resetUrl}" target="_blank" rel="noreferrer" style="color:#2563eb;">비밀번호 재설정 링크 열기</a></p>`
          : "<p style='margin:0 0 10px;'>관리자에게 문의해주세요.</p>"
      }
      <p style="margin:0 0 10px; color:#666;">링크 만료 시각: ${expiresLabel}</p>
      <p style="margin:0; color:#666;">본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
    </div>
  `;

  await axios.post(
    "https://api.resend.com/emails",
    {
      from: env.RESEND_FROM_EMAIL,
      to: [params.to],
      subject,
      html,
      text,
    },
    {
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }
  );

  return { sent: true };
}

