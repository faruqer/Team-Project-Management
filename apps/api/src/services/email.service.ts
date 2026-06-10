import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transporter =
  env.SMTP_HOST && env.SMTP_PORT
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth:
          env.SMTP_USER && env.SMTP_PASS
            ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
            : undefined,
      })
    : null;

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  if (!transporter) {
    console.log('[Email - dev mode]', {
      to: options.to,
      subject: options.subject,
      text: options.text ?? options.html,
    });
    return;
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
  });
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  organizationSlug: string,
): Promise<void> {
  const verifyUrl = `${env.API_URL}/api/auth/verify-email?token=${token}&org=${organizationSlug}`;

  await sendEmail({
    to: email,
    subject: 'Verify your Orbit account',
    html: `
      <h2>Welcome to Orbit</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Verify your email: ${verifyUrl}`,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  organizationSlug: string,
): Promise<void> {
  const resetUrl = `${env.API_URL}/api/auth/reset-password?token=${token}&org=${organizationSlug}`;

  await sendEmail({
    to: email,
    subject: 'Reset your Orbit password',
    html: `
      <h2>Password Reset</h2>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link expires in 1 hour. If you did not request this, ignore this email.</p>
    `,
    text: `Reset your password: ${resetUrl}`,
  });
}

export async function sendInvitationEmail(
  email: string,
  token: string,
  organizationSlug: string,
  organizationName: string,
  role: string,
): Promise<void> {
  const inviteUrl = `${env.FRONTEND_URL}/invite/accept?token=${token}&org=${organizationSlug}`;

  await sendEmail({
    to: email,
    subject: `You're invited to join ${organizationName} on Orbit`,
    html: `
      <h2>You're invited!</h2>
      <p>You've been invited to join <strong>${organizationName}</strong> as <strong>${role}</strong>.</p>
      <p><a href="${inviteUrl}">Accept Invitation</a></p>
      <p>This link expires in 7 days.</p>
    `,
    text: `Accept your invitation: ${inviteUrl}`,
  });
}
