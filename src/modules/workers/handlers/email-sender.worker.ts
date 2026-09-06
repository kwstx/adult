import {
  Job,
  EmailSendPayload,
  EmailSendResult,
  WorkerHandler,
} from "../types";

export const emailSenderWorker: WorkerHandler<
  EmailSendPayload,
  EmailSendResult
> = async (job: Job<EmailSendPayload>, updateProgress) => {
  const { to, toName, template, subject, variables } = job.payload;

  console.log(`[EmailSenderWorker] ✉️ Sending "${template}" email to ${to}`);
  await updateProgress(20);

  // 1. Render HTML Template
  const htmlBody = renderEmailTemplate(template, {
    recipientName: toName || to.split("@")[0],
    ...variables,
  });

  await updateProgress(50);

  // 2. Dispatch via Email Provider (e.g. Resend, SendGrid, Amazon SES, or Postmark)
  // In production:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from: 'noreply@platform.local', to, subject, html: htmlBody });

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const deliveredAt = new Date().toISOString();

  // Simulate network dispatch with potential error handling
  await new Promise((resolve) => setTimeout(resolve, 50));

  await updateProgress(100);
  console.log(`[EmailSenderWorker] ✅ Email delivered to ${to} (MessageId: ${messageId})`);

  return {
    messageId,
    recipient: to,
    deliveredAt,
    provider: process.env.EMAIL_PROVIDER || "Simulated_SES_Adapter",
  };
};

function renderEmailTemplate(
  template: EmailSendPayload["template"],
  vars: Record<string, any>
): string {
  switch (template) {
    case "KYC_APPROVED":
      return `
        <div style="font-family: sans-serif; padding: 20px; color: #111;">
          <h2>Congratulations ${vars.recipientName}!</h2>
          <p>Your creator identity and 2257 compliance documentation has been officially <strong>APPROVED</strong>.</p>
          <p>You may now go live, configure your tip menu, and start receiving earnings.</p>
          <a href="${vars.dashboardUrl || '#'}" style="display:inline-block; background:#6366f1; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none;">Go To Creator Control Room</a>
        </div>
      `;
    case "PURCHASE_RECEIPT":
      return `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Purchase Receipt</h2>
          <p>Thank you for your purchase of <strong>${vars.creditsPurchased || 0} Credits</strong>.</p>
          <p>Transaction ID: <code>${vars.transactionId || 'TX-000'}</code></p>
          <p>Total Paid: \$${((vars.amountCents || 0) / 100).toFixed(2)} USD</p>
        </div>
      `;
    case "PAYOUT_PROCESSED":
      return `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Payout Completed</h2>
          <p>Your requested payout of <strong>\$${((vars.amountPaidCents || 0) / 100).toFixed(2)} USD</strong> has been transferred via ${vars.payoutMethod || 'Direct Rail'}.</p>
          <p>Reference: <code>${vars.reference || 'PAY-000'}</code></p>
        </div>
      `;
    case "SECURITY_ALERT":
      return `
        <div style="font-family: sans-serif; padding: 20px; background: #fff1f2; border: 1px solid #fda4af;">
          <h2 style="color: #be123c;">⚠️ Security Notice</h2>
          <p>A suspicious event was detected on your account or a high-risk moderation flag was triggered.</p>
          <p>Details: <strong>${vars.flags || 'Unusual login pattern'}</strong></p>
          <p>Risk Score: ${vars.riskScore || 'N/A'}</p>
        </div>
      `;
    case "CREATOR_GO_LIVE":
      return `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>🔴 ${vars.creatorName || 'A creator you follow'} is LIVE right now!</h2>
          <p>${vars.streamTitle || 'Join the live interactive stream now.'}</p>
          <a href="${vars.streamUrl || '#'}" style="display:inline-block; background:#e11d48; color:#fff; padding:10px 20px; border-radius:6px; text-decoration:none;">Watch Livestream</a>
        </div>
      `;
    default:
      return `<div><p>Platform notification for ${vars.recipientName}.</p></div>`;
  }
}
