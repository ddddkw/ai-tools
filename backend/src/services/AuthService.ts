import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { pool } from '../database';
import { config } from '../config';
import { User, AuthTokens, TokenPayload } from '../types';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour
const VERIFICATION_CODE_EXPIRY = 5 * 60 * 1000; // 5 minutes

export class AuthService {
  // ==================== Registration ====================

  async registerWithEmail(email: string, password: string, name: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, username, is_email_verified)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, email, username, avatar_url, provider, is_email_verified, is_active, created_at, updated_at`,
      [email, passwordHash, name]
    );
    return result.rows[0];
  }

  // ==================== Login ====================

  async loginWithEmail(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user: any = userResult.rows[0];

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 1000 / 60);
      throw new Error(`Account locked. Try again in ${remaining} minutes.`);
    }

    // Social login accounts don't have password
    if (!user.password_hash) {
      throw new Error('This account uses social login. Please login with GitHub.');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      // Increment failed login attempts
      const newAttempts = (user.failed_login_attempts || 0) + 1;
      let lockedUntil = null;

      if (newAttempts >= 5) {
        lockedUntil = new Date(Date.now() + 5 * 60 * 1000); // Lock for 5 minutes
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [newAttempts, lockedUntil, user.id]
        );
      } else {
        await pool.query(
          'UPDATE users SET failed_login_attempts = $1 WHERE id = $2',
          [newAttempts, user.id]
        );
      }

      throw new Error('Invalid credentials');
    }

    // Reset failed attempts on successful login
    if (user.failed_login_attempts > 0 || user.locked_until) {
      await pool.query(
        'UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
    } else {
      await pool.query('UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    }

    const tokens = await this.generateTokens(user.id);
    return { user, tokens };
  }

  // ==================== Token Generation ====================

  async generateTokens(userId: string): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      config.jwt.secret,
      { expiresIn: ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: REFRESH_TOKEN_EXPIRY }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, refreshToken, expiresAt]
    );

    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.secret) as TokenPayload;

      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      const sessionResult = await pool.query(
        `SELECT * FROM refresh_tokens
         WHERE token = $1 AND expires_at > NOW() AND revoked = FALSE`,
        [refreshToken]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Invalid or expired refresh token');
      }

      // Revoke old refresh token
      await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1', [
        sessionResult.rows[0].id,
      ]);

      // Generate new tokens
      return await this.generateTokens(payload.userId);
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE token = $1', [refreshToken]);
  }

  // ==================== Password Reset ====================

  async forgotPassword(email: string): Promise<{ token: string; expiresAt: Date }> {
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists
      return { token: '', expiresAt: new Date() };
    }

    const userId = userResult.rows[0].id;
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    // In production, send email here
    // For now, log the token
    console.log(`[DEV] Password reset token for ${email}: ${token}`);

    return { token, expiresAt };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenResult = await pool.query(
      `SELECT user_id FROM password_reset_tokens
       WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      throw new Error('Invalid or expired reset token');
    }

    const userId = tokenResult.rows[0].user_id;
    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, userId]
    );

    // Delete used token
    await pool.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]);

    // Revoke all existing refresh tokens (force re-login)
    await pool.query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [userId]);
  }

  // ==================== User Profile ====================

  async getUserById(userId: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, email, username, avatar_url, phone, provider, is_email_verified,
              is_phone_verified, is_active, last_login_at, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0] || null;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (updates.email) {
      fields.push(`email = $${idx++}`);
      values.push(updates.email);
    }
    if (updates.username) {
      fields.push(`username = $${idx++}`);
      values.push(updates.username);
    }
    if (updates.avatarUrl) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(updates.avatarUrl);
    }
    if (updates.phone) {
      fields.push(`phone = $${idx++}`);
      values.push(updates.phone);
    }

    if (fields.length === 0) {
      return (await this.getUserById(userId))!;
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );

    return result.rows[0] as User;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const user: any = userResult.rows[0];

    if (user.password_hash) {
      const isValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValid) throw new Error('Invalid old password');
    }

    const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );
  }

  // ==================== Phone Auth (existing) ====================

  async registerWithPhone(phone: string): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (phone) VALUES ($1) RETURNING id, phone, ai_provider, created_at, updated_at`,
      [phone]
    );
    return result.rows[0];
  }

  async sendVerificationCode(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY);

    await pool.query(
      `INSERT INTO verification_codes (phone, code, expires_at) VALUES ($1, $2, $3)`,
      [phone, code, expiresAt]
    );

    console.log(`[DEV] Verification code for ${phone}: ${code}`);
    return code;
  }

  async loginWithPhone(phone: string, code: string): Promise<{ user: User; tokens: AuthTokens }> {
    const codeResult = await pool.query(
      `SELECT * FROM verification_codes
       WHERE phone = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [phone, code]
    );

    if (codeResult.rows.length === 0) {
      throw new Error('Invalid or expired verification code');
    }

    await pool.query('UPDATE verification_codes SET used = TRUE WHERE id = $1', [
      codeResult.rows[0].id,
    ]);

    let userResult = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
    let user: any;

    if (userResult.rows.length === 0) {
      user = await this.registerWithPhone(phone);
    } else {
      user = userResult.rows[0];
    }

    const tokens = await this.generateTokens(user.id);
    return { user, tokens };
  }

  async handleGithubCallback(code: string): Promise<{ user: User; tokens: AuthTokens; isNewUser: boolean }> {
    let userResult = await pool.query('SELECT * FROM users WHERE github_id = $1', [
      'demo-github-user',
    ]);
    let isNewUser = false;
    let user: any;

    if (userResult.rows.length === 0) {
      userResult = await pool.query(
        `INSERT INTO users (github_id, github_token) VALUES ($1, $2) RETURNING *`,
        ['demo-github-user', 'demo-token']
      );
      user = userResult.rows[0];
      isNewUser = true;
    } else {
      user = userResult.rows[0];
    }

    const tokens = await this.generateTokens(user.id);
    return { user, tokens, isNewUser };
  }
}

export const authService = new AuthService();
