export interface User {
  id: string;
  email?: string;
  username?: string;
  phone?: string;
  github_id?: string;
  avatar_url?: string;
  password_hash?: string;
  github_token?: string;
  figma_token?: string;
  provider: 'local' | 'github' | 'phone';
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  failed_login_attempts?: number;
  locked_until?: Date;
  last_login_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export interface GithubProfile {
  id: string;
  username: string;
  email?: string;
  avatarUrl?: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}
