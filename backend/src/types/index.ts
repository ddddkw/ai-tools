export interface User {
  id: string;
  phone?: string;
  email?: string;
  githubId?: string;
  passwordHash?: string;
  githubToken?: string;
  figmaToken?: string;
  aiProvider: 'openai' | 'claude';
  createdAt: Date;
  updatedAt: Date;
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
