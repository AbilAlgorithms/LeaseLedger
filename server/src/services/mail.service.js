import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter = null;

async function getTransporter() {
  if (transporter) return transporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT || 587,
      secure: env.SMTP_PORT === 465,
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
      },
    });
  } else {
    // Development fallback: mock or test transporter
    transporter = {
      sendMail: async (mailOptions) => {
        if (env.NODE_ENV !== 'test') {
          console.log(`\n--- [MAIL SERVICE (DEV)] ---`);
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Body:\n${mailOptions.text || mailOptions.html}`);
          console.log(`-----------------------------\n`);
        }
        return { messageId: `mock-${Date.now()}` };
      },
    };
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text }) {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: env.MAIL_FROM,
      to,
      subject,
      text: text || html?.replace(/<[^>]*>?/gm, '') || '',
      html,
    });
    return info;
  } catch (error) {
    console.error(`[MailService] Failed to dispatch email to ${to}:`, error.message);
    return null; // Non-blocking
  }
}

export async function sendVerificationEmail(email, name, token) {
  const verifyUrl = `${env.CLIENT_URL}/verify-email/${token}`;
  return sendEmail({
    to: email,
    subject: 'LeaseLedger — Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eef5f2; border-radius: 8px;">
        <h2 style="color: #002720;">Welcome to LeaseLedger, ${name}!</h2>
        <p style="color: #414846; font-size: 15px; line-height: 1.5;">Please confirm your email address to activate your digital rental ledger account and start co-conducting property condition inspections.</p>
        <div style="margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #183D35; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="color: #717976; font-size: 13px;">Or copy and paste this URL into your browser:</p>
        <p style="color: #41655c; font-size: 12px; word-break: break-all;">${verifyUrl}</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email, name, token) {
  const resetUrl = `${env.CLIENT_URL}/reset-password/${token}`;
  return sendEmail({
    to: email,
    subject: 'LeaseLedger — Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eef5f2; border-radius: 8px;">
        <h2 style="color: #002720;">Password Reset Request</h2>
        <p style="color: #414846; font-size: 15px; line-height: 1.5;">Hello ${name}, a request was made to reset your LeaseLedger account password. This link is valid for 1 hour.</p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #183D35; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #717976; font-size: 13px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

export async function sendTenancyInvitationEmail(email, landlordName, propertyAddress, token) {
  const joinUrl = `${env.CLIENT_URL}/join/${token}`;
  return sendEmail({
    to: email,
    subject: `LeaseLedger — Tenancy Invitation for ${propertyAddress}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #eef5f2; border-radius: 8px;">
        <h2 style="color: #002720;">Tenancy Handover Invitation</h2>
        <p style="color: #414846; font-size: 15px; line-height: 1.5;"><strong>${landlordName}</strong> has invited you to join the digital tenancy record for <strong>${propertyAddress}</strong>.</p>
        <p style="color: #414846; font-size: 14px;">Together, you will jointly inspect, verify condition photos, record meter readings, and establish a tamper-proof digital record to ensure a smooth, dispute-free rental handover.</p>
        <div style="margin: 32px 0;">
          <a href="${joinUrl}" style="background-color: #183D35; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accept Invitation & Join Property</a>
        </div>
        <p style="color: #717976; font-size: 13px;">This invitation is valid for 7 days. You can also paste this link directly:</p>
        <p style="color: #41655c; font-size: 12px; word-break: break-all;">${joinUrl}</p>
      </div>
    `,
  });
}
