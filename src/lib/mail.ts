import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env } from "./env";

let transporter: Transporter | null = null;

export function mailConfigured() {
  return Boolean(env.smtpHost);
}

function transport() {
  transporter ??= nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPassword } : undefined,
    // Fail in seconds, not minutes, when the mail server can't be reached.
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  return transporter;
}

/** Logged once at start-up so a mail problem shows in the logs straight away. */
export async function verifyMail() {
  if (!mailConfigured()) {
    console.log("[mail] SMTP_HOST is empty: email notifications are off");
    return;
  }
  const where = `${env.smtpHost}:${env.smtpPort}${env.smtpSecure ? " (TLS)" : ""}`;
  try {
    await transport().verify();
    console.log(`[mail] connected to ${where}${env.smtpUser ? ` as ${env.smtpUser}` : " without sign-in"}`);
  } catch (err) {
    console.error(`[mail] cannot use ${where}: ${(err as Error).message}`);
  }
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type Mail = {
  to: string[];
  subject: string;
  heading: string;
  /** Plain-text paragraphs. */
  lines: string[];
  /** Quoted block, e.g. the reply text. */
  quote?: string;
  link: { label: string; href: string };
};

/** Sends one message per recipient. Failures are logged, never thrown. */
export async function sendMail(mail: Mail) {
  if (!mailConfigured()) return;
  const recipients = [...new Set(mail.to.map((a) => a.toLowerCase()))];
  const text = [
    mail.heading,
    "",
    ...mail.lines,
    ...(mail.quote ? ["", mail.quote.replace(/^/gm, "> ")] : []),
    "",
    `${mail.link.label}: ${mail.link.href}`,
    "",
    `— ${env.orgName}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f3f5f7;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#17222b">
<table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #dde3e8;border-radius:8px"><tr><td style="padding:28px">
<p style="margin:0 0 4px;font-size:13px;color:#5a6772">${esc(env.orgName)}</p>
<h1 style="margin:0 0 16px;font-size:18px;line-height:1.35">${esc(mail.heading)}</h1>
${mail.lines.map((l) => `<p style="margin:0 0 10px;font-size:14px;line-height:1.55">${esc(l)}</p>`).join("")}
${mail.quote ? `<div style="margin:14px 0;padding:12px 14px;border-left:3px solid #0b5a6b;background:#f3f5f7;font-size:14px;line-height:1.55;white-space:pre-wrap">${esc(mail.quote)}</div>` : ""}
<p style="margin:20px 0 0"><a href="${esc(mail.link.href)}" style="display:inline-block;padding:9px 16px;background:#0b5a6b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">${esc(mail.link.label)}</a></p>
</td></tr></table></body></html>`;

  await Promise.all(
    recipients.map((to) =>
      transport()
        .sendMail({ from: env.mailFrom, to, subject: mail.subject, text, html })
        .then(() => console.log(`[mail] sent "${mail.subject}" to ${to}`))
        .catch((err) => console.error(`[mail] could not send "${mail.subject}" to ${to}: ${err.message}`)),
    ),
  );
}
