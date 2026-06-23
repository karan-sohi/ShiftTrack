import { Resend } from "resend";

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Your ShiftTrack verification code",
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 8px;">Verify your email</h2>
        <p style="margin:0 0 20px;color:#52525b;">Enter this code in the app to continue:</p>
        <div style="font-size:36px;font-weight:700;letter-spacing:12px;text-align:center;
                    padding:20px;background:#f4f4f5;border-radius:12px;color:#09090b;">
          ${code}
        </div>
        <p style="margin:16px 0 0;font-size:13px;color:#a1a1aa;">
          Expires in 15 minutes. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });
}
