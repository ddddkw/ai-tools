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

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  github_repo: string | null;
  github_branch: string;
  created_at: Date;
  updated_at: Date;
}

export interface Requirement {
  id: string;
  project_id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  status: 'draft' | 'analyzing' | 'analyzed' | 'approved';
  created_at: Date;
  updated_at: Date;
}

export interface CreateProjectDTO {
  name: string;
  description?: string;
  github_repo?: string;
  github_branch?: string;
}

export interface UpdateProjectDTO {
  name?: string;
  description?: string;
  github_repo?: string;
  github_branch?: string;
}

export interface CreateRequirementDTO {
  title: string;
  content: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface UpdateRequirementDTO {
  title?: string;
  content?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
