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

export async function sendReminderEmail(
  to: string,
  opts: {
    companyName: string;
    workDate: Date;
    startTime: string;
    endTime: string;
    logUrl: string;
  }
): Promise<void> {
  const dateLabel = opts.workDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  await getResend().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: `ShiftTrack: did you forget to log ${opts.companyName} hours?`,
    html: `
      <div style="font-family:sans-serif;max-width:440px;margin:0 auto;padding:24px;">
        <h2 style="margin:0 0 8px;color:#09090b;">Hours not logged</h2>
        <p style="margin:0 0 20px;color:#52525b;">
          It looks like you haven't logged your shift for
          <strong>${opts.companyName}</strong> on <strong>${dateLabel}</strong>
          (${opts.startTime}&nbsp;–&nbsp;${opts.endTime}).
        </p>
        <a href="${opts.logUrl}"
           style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:10px;font-weight:600;font-size:14px;">
          Log hours now
        </a>
        <p style="margin:20px 0 0;font-size:12px;color:#a1a1aa;">
          To turn off these reminders, open ShiftTrack &rarr; Reminders.
        </p>
      </div>
    `,
  });
}
