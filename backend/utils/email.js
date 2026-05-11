import nodemailer from "nodemailer";

// ── Transporter ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = `"${process.env.APP_NAME || "Mattermost"}" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`;
const APP_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ── Core send helper ──────────────────────────────────────────────────────────
const sendMail = ({ to, subject, html }) =>
  transporter.sendMail({ from: FROM, to, subject, html });

// ── Shared layout wrapper ─────────────────────────────────────────────────────
const layout = (body) => `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { margin: 0; padding: 0; background: #f4f4f8; font-family: 'Segoe UI', Arial, sans-serif; }
        .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header  { background: #1e1e2e; padding: 28px 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; color: #ffffff; letter-spacing: -0.3px; }
        .header span { color: #5d5fe8; }
        .body    { padding: 32px; color: #2a2a3e; font-size: 15px; line-height: 1.7; }
        .btn     { display: inline-block; margin: 24px 0 8px; padding: 12px 28px; background: #5d5fe8; color: #ffffff !important; text-decoration: none; border-radius: 7px; font-weight: 600; font-size: 15px; }
        .divider { border: none; border-top: 1px solid #eeeef4; margin: 24px 0; }
        .footer  { padding: 20px 32px; background: #f8f8fc; text-align: center; font-size: 12px; color: #9090b0; }
        .link    { color: #5d5fe8; word-break: break-all; font-size: 13px; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <h1>Dev <span>Workspace</span></h1>
        </div>
        <div class="body">${body}</div>
        <div class="footer">© ${new Date().getFullYear()} Dev Workspace · You received this because you have an account.</div>
      </div>
    </body>
  </html>
`;

// ── Templates ─────────────────────────────────────────────────────────────────

/**
 * Verify email address
 * @param {string} to
 * @param {string} displayName
 * @param {string} token
 */
export const sendVerificationEmail = (to, displayName, token) => {
  const url = `${APP_URL}/verify-email?token=${token}`;
  return sendMail({
    to,
    subject: "Verify your email address",
    html: layout(`
      <p>Hi <strong>${displayName}</strong>,</p>
      <p>Thanks for signing up! Please verify your email address by clicking the button below.</p>
      <p>This link expires in <strong>24 hours</strong>.</p>
      <a href="${url}" class="btn">Verify Email</a>
      <hr class="divider" />
      <p>Or paste this link in your browser:</p>
      <a href="${url}" class="link">${url}</a>
      <p style="color:#9090b0;font-size:13px;margin-top:16px;">If you did not create an account, you can safely ignore this email.</p>
    `),
  });
};

/**
 * Password reset
 * @param {string} to
 * @param {string} displayName
 * @param {string} token
 */
export const sendPasswordResetEmail = (to, displayName, token) => {
  const url = `${APP_URL}/reset-password?token=${token}`;
  return sendMail({
    to,
    subject: "Reset your password",
    html: layout(`
      <p>Hi <strong>${displayName}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to choose a new one.</p>
      <p>This link expires in <strong>30 minutes</strong>.</p>
      <a href="${url}" class="btn">Reset Password</a>
      <hr class="divider" />
      <p>Or paste this link in your browser:</p>
      <a href="${url}" class="link">${url}</a>
      <p style="color:#9090b0;font-size:13px;margin-top:16px;">If you did not request a password reset, you can safely ignore this email.</p>
    `),
  });
};

/**
 * Workspace invitation
 * @param {string} to
 * @param {string} inviterName
 * @param {string} token
 */
export const sendInviteEmail = (to, inviterName, token) => {
  const url = `${APP_URL}/join?token=${token}`;
  return sendMail({
    to,
    subject: `${inviterName} invited you to Dev Workspace`,
    html: layout(`
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>Dev Workspace</strong> — a real-time messaging platform for your team.</p>
      <p>Click below to accept the invitation and create your account.</p>
      <a href="${url}" class="btn">Accept Invitation</a>
      <hr class="divider" />
      <p>Or paste this link in your browser:</p>
      <a href="${url}" class="link">${url}</a>
      <p style="color:#9090b0;font-size:13px;margin-top:16px;">This invitation expires in 7 days.</p>
    `),
  });
};

/**
 * Account deactivated
 * @param {string} to
 * @param {string} displayName
 */
export const sendDeactivationEmail = (to, displayName) =>
  sendMail({
    to,
    subject: "Your account has been deactivated",
    html: layout(`
      <p>Hi <strong>${displayName}</strong>,</p>
      <p>Your Dev Workspace account has been deactivated by an admin.</p>
      <p>If you believe this was a mistake, please contact your workspace administrator.</p>
    `),
  });

export default transporter;