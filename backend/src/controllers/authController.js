const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../config/database');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');

const signToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const signRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });

const sendTokens = (res, user, statusCode = 200) => {
  const token = signToken(user.id);
  const refreshToken = signRefreshToken(user.id);

  // httpOnly refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });

  const { password_hash, ...userData } = user;
  res.status(statusCode).json({ success: true, token, user: userData });
};

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Validation failed', 400, errors.array());

  const { email, password, first_name, last_name, role = 'buyer' } = req.body;

  // Validate role
  const allowedRoles = ['buyer', 'seller'];
  if (!allowedRoles.includes(role)) throw new AppError('Invalid role', 400);

  const password_hash = await bcrypt.hash(password, 12);

  const { rows } = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [email.toLowerCase(), password_hash, first_name, last_name, role]
  );

  const user = rows[0];

  // Create cart for the user
  await query('INSERT INTO carts (user_id) VALUES ($1)', [user.id]);

  // Send verification email (non-blocking)
  sendVerificationEmail(user).catch(() => {});

  sendTokens(res, user, 201);
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) throw new AppError('Validation failed', 400, errors.array());

  const { email, password } = req.body;

  const { rows } = await query(
    'SELECT * FROM users WHERE email = $1',
    [email.toLowerCase()]
  );

  if (!rows.length) throw new AppError('Invalid email or password', 401);

  const user = rows[0];
  if (!user.is_active) throw new AppError('Account deactivated. Contact support.', 403);

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) throw new AppError('Invalid email or password', 401);

  sendTokens(res, user);
});

// POST /api/auth/refresh
const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new AppError('Refresh token required', 401);

  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

  const { rows } = await query(
    'SELECT * FROM users WHERE id = $1 AND is_active = TRUE',
    [decoded.userId]
  );
  if (!rows.length) throw new AppError('User not found', 401);

  sendTokens(res, rows[0]);
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `SELECT id, email, first_name, last_name, role, avatar_url, phone, is_verified, created_at
     FROM users WHERE id = $1`,
    [req.user.id]
  );
  res.json({ success: true, user: rows[0] });
});

// POST /api/auth/forgot-password
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);

  // Always return success to prevent email enumeration
  if (rows.length) {
    const user = rows[0];
    const resetToken = jwt.sign({ userId: user.id, purpose: 'reset' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    await sendPasswordResetEmail(user, resetToken).catch(() => {});
  }

  res.json({ success: true, message: 'If an account exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password
const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.purpose !== 'reset') throw new Error();
  } catch {
    throw new AppError('Invalid or expired reset token', 400);
  }

  const password_hash = await bcrypt.hash(password, 12);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, decoded.userId]);

  res.json({ success: true, message: 'Password reset successfully' });
});

module.exports = { register, login, refreshToken, logout, getMe, forgotPassword, resetPassword };
