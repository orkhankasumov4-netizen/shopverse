const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const baseTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; }
    .header { background: #232f3e; padding: 24px; text-align: center; }
    .header h1 { color: #ff9900; margin: 0; font-size: 24px; }
    .body { padding: 32px; color: #333; line-height: 1.6; }
    .btn { display: inline-block; background: #ff9900; color: #fff; padding: 12px 28px;
           border-radius: 4px; text-decoration: none; font-weight: bold; margin: 16px 0; }
    .footer { background: #f5f5f5; padding: 16px; text-align: center; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>🛒 ShopVerse</h1></div>
    <div class="body">${content}</div>
    <div class="footer">© ${new Date().getFullYear()} ShopVerse Marketplace. All rights reserved.</div>
  </div>
</body>
</html>`;

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error('Email send failed:', err.message);
  }
};

const sendVerificationEmail = async (user) => {
  const jwt = require('jsonwebtoken');
  const token = jwt.sign({ userId: user.id, purpose: 'verify' }, process.env.JWT_SECRET, { expiresIn: '24h' });
  const link = `${process.env.CLIENT_URL}/auth/verify?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your ShopVerse account',
    html: baseTemplate(`
      <h2>Welcome to ShopVerse, ${user.first_name}!</h2>
      <p>Please verify your email address to complete your registration.</p>
      <a class="btn" href="${link}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `),
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const link = `${process.env.CLIENT_URL}/auth/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: 'Reset your ShopVerse password',
    html: baseTemplate(`
      <h2>Password Reset Request</h2>
      <p>Hi ${user.first_name}, you requested to reset your password.</p>
      <a class="btn" href="${link}">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `),
  });
};

const sendOrderConfirmationEmail = async (user, order, items) => {
  const itemsHtml = items.map(i => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee">${i.title}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${i.total_price}</td>
    </tr>`).join('');

  await sendEmail({
    to: user.email,
    subject: `Order Confirmed — ${order.order_number}`,
    html: baseTemplate(`
      <h2>Your order is confirmed! 🎉</h2>
      <p>Hi ${user.first_name}, thanks for your order. We'll notify you when it ships.</p>
      <p><strong>Order:</strong> ${order.order_number}</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">
        <thead><tr style="background:#f5f5f5">
          <th style="padding:8px;text-align:left">Item</th>
          <th style="padding:8px;text-align:center">Qty</th>
          <th style="padding:8px;text-align:right">Total</th>
        </tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot><tr>
          <td colspan="2" style="padding:8px;font-weight:bold">Order Total</td>
          <td style="padding:8px;text-align:right;font-weight:bold">$${order.total}</td>
        </tr></tfoot>
      </table>
      <a class="btn" href="${process.env.CLIENT_URL}/dashboard/orders/${order.id}">View Order</a>
    `),
  });
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail, sendOrderConfirmationEmail };
