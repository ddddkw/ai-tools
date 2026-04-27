const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://47.100.186.167:3000";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface User {
  id: string;
  email?: string;
  username?: string;
  phone?: string;
  avatar_url?: string;
  provider: "local" | "github" | "phone";
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
  };
}

class AuthApi {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  getAccessToken() {
    if (typeof window !== "undefined") {
      return localStorage.getItem("accessToken");
    }
    return this.accessToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getAccessToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok || !data.success) {
      const message = data.error?.message || data.message || "Request failed";
      throw new Error(message);
    }

    return data.data as T;
  }

  // ==================== Auth Endpoints ====================

  async register(
    email: string,
    password: string,
    name: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const data = await this.request<{ user: User; tokens: AuthTokens }>(
      "/api/auth/register/email",
      {
        method: "POST",
        body: JSON.stringify({ email, password, name }),
      }
    );

    if (data.tokens) {
      this.setAccessToken(data.tokens.accessToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", data.tokens.accessToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
      }
    }

    return data;
  }

  async login(
    email: string,
    password: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const data = await this.request<{ user: User; tokens: AuthTokens }>(
      "/api/auth/login/email",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );

    if (data.tokens) {
      this.setAccessToken(data.tokens.accessToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", data.tokens.accessToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
      }
    }

    return data;
  }

  async logout(refreshToken: string): Promise<void> {
    await this.request("/api/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    this.clearTokens();
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const data = await this.request<{ tokens: AuthTokens }>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    if (data.tokens) {
      this.setAccessToken(data.tokens.accessToken);
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", data.tokens.accessToken);
        localStorage.setItem("refreshToken", data.tokens.refreshToken);
      }
    }

    return data.tokens;
  }

  async me(): Promise<User> {
    const data = await this.request<{ user: User }>("/api/auth/me");
    return data.user;
  }

  async forgotPassword(email: string): Promise<void> {
    await this.request("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    await this.request("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
  }

  clearTokens() {
    this.accessToken = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }
}

export const authApi = new AuthApi();
