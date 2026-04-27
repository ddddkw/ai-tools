import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { pool } from '../database';
import { config } from '../config';
import { User, AuthTokens, TokenPayload } from '../types';

export class AuthService {
  async registerWithEmail(email: string, password: string): Promise<User> {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, ai_provider, created_at, updated_at`,
      [email, passwordHash]
    );
    return result.rows[0];
  }

  async loginWithEmail(email: string, password: string): Promise<{ user: User; tokens: AuthTokens }> {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) throw new Error('Invalid credentials');
    const user: any = result.rows[0];
    if (!user.password_hash) throw new Error('This account uses social login');
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) throw new Error('Invalid credentials');
    const tokens = await this.generateTokens(user.id);
    return { user, tokens };
  }

  async registerWithPhone(phone: string): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (phone) VALUES ($1) RETURNING id, phone, ai_provider, created_at, updated_at`,
      [phone]
    );
    return result.rows[0];
  }

  async sendVerificationCode(phone: string): Promise<string> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await pool.query(
      `INSERT INTO verification_codes (phone, code, expires_at) VALUES ($1, $2, $3)`,
      [phone, code, expiresAt]
    );
    console.log(`[DEV] Verification code for ${phone}: ${code}`);
    return code;
  }

  async loginWithPhone(phone: string, code: string): Promise<{ user: User; tokens: AuthTokens }> {
    const codeResult = await pool.query(
      `SELECT * FROM verification_codes WHERE phone = $1 AND code = $2 AND used = FALSE AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [phone, code]
    );
    if (codeResult.rows.length === 0) throw new Error('Invalid or expired verification code');
    await pool.query('UPDATE verification_codes SET used = TRUE WHERE id = $1', [codeResult.rows[0].id]);
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
    let userResult = await pool.query('SELECT * FROM users WHERE github_id = $1', ['demo-github-user']);
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

  async generateTokens(userId: string): Promise<AuthTokens> {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      config.jwt.secret,
      { expiresIn: '7d' }
    );
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      config.jwt.secret,
      { expiresIn: '30d' }
    );
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO sessions (user_id, refresh_token, expires_at) VALUES ($1, $2, $3)`,
      [userId, refreshToken, expiresAt]
    );
    return { accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = jwt.verify(refreshToken, config.jwt.secret) as TokenPayload;
      if (payload.type !== 'refresh') throw new Error('Invalid token type');
      const sessionResult = await pool.query(
        `SELECT * FROM sessions WHERE refresh_token = $1 AND expires_at > NOW()`,
        [refreshToken]
      );
      if (sessionResult.rows.length === 0) throw new Error('Invalid or expired refresh token');
      await pool.query('DELETE FROM sessions WHERE id = $1', [sessionResult.rows[0].id]);
      return await this.generateTokens(payload.userId);
    } catch {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [refreshToken]);
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    return result.rows[0] || null;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (updates.email) { fields.push(`email = $${idx++}`); values.push(updates.email); }
    if (updates.phone) { fields.push(`phone = $${idx++}`); values.push(updates.phone); }
    if (updates.aiProvider) { fields.push(`ai_provider = $${idx++}`); values.push(updates.aiProvider); }
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
    if (userResult.rows.length === 0) throw new Error('User not found');
    const user: any = userResult.rows[0];
    if (user.password_hash) {
      const isValid = await bcrypt.compare(oldPassword, user.password_hash);
      if (!isValid) throw new Error('Invalid old password');
    }
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );
  }
}

export const authService = new AuthService();
