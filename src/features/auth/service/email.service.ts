import { Resend } from 'resend';
import { config } from '../../../config.js';

const resend = new Resend(config.resendApiKey);

const sendEmail = async (to: string, subject: string, html: string) => {
  if (!config.resendApiKey) {
    console.warn(`[email] RESEND_API_KEY not set. Would send to ${to}: ${subject}`);
    return;
  }

  try {
  const result =
    await resend.emails.send({
      from: config.resendFromEmail,
      to,
      subject,
      html,
    });

  console.log(
    "Email result:",
    result
  );

} catch (error) {

  console.error(
    "Email failed:",
    error
  );

  throw error;
}
};


export const sendInvitationEmail = async (
  email: string,
  token: string,
  role: string
): Promise<void> => {
  const inviteUrl = `${config.frontendUrl}/accept-invitation?token=${encodeURIComponent(token)}`;

  await sendEmail(
    email,
    'You have been invited to Derba Cafeteria',
    `
      <p>You have been invited as <strong>${role}</strong>.</p>
      <p>Click the link below to set your password. This link expires in ${config.invitationExpiresHours} hours.</p>
      <p><a href="${inviteUrl}">Accept invitation</a></p>
      <p>If you did not expect this email, you can ignore it.</p>
    `
  );
};

export const sendPasswordResetEmail = async (
  email: string,
  token: string
): Promise<void> => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  await sendEmail(
    email,
    'Reset your password',
    `
      <p>We received a request to reset your password.</p>
      <p>Click the link below to choose a new password. This link expires in ${config.passwordResetExpiresHours} hour(s).</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `
  );
};
