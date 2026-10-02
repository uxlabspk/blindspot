import nodemailer from "nodemailer";

type Mail = { to: string; subject: string; text: string };

// ponytail: without SMTP_URL the auth link is only printed to the server console (dev) — ceiling: no real delivery, no bounce/open tracking.
// upgrade path: set SMTP_URL=smtps://user:pass@host, or swap sendMail for a transactional API (Resend/SES/Postmark) when you need deliverability metrics.
export async function sendMail({ to, subject, text }: Mail): Promise<void> {
  const url = process.env.SMTP_URL;
  if (!url) {
    console.log(`\n[email:dev] to=${to}\nsubject=${subject}\n${text}\n`);
    return;
  }
  try {
    const transport = nodemailer.createTransport(url);
    await transport.sendMail({
      from: process.env.SMTP_FROM ?? "Blindspot <no-reply@localhost>",
      to,
      subject,
      text,
    });
  } catch (err) {
    // never throw: callers fire-and-forget to avoid timing side channels
    console.error("sendMail failed:", err);
  }
}
