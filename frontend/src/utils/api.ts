const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  github_repo?: string;
  github_branch?: string;
  created_at: string;
  updated_at: string;
}

interface Requirement {
  id: string;
  project_id: string;
  title: string;
  content: string;
  priority: string;
  status: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...fetchOptions, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  if (response.status === 204) return {} as T;
  return response.json();
}

export const api = {
  projects: {
    list: (params?: any, token?: string) =>
      fetchAPI<{ data: Project[]; total: number; page: number; limit: number; totalPages: number }>(
        `/projects?${new URLSearchParams(params as any)}`, { token }),
    create: (data: any, token: string) =>
      fetchAPI<Project>('/projects', { method: 'POST', body: JSON.stringify(data), token }),
    get: (id: string, token: string) =>
      fetchAPI<Project>(`/projects/${id}`, { token }),
    update: (id: string, data: any, token: string) =>
      fetchAPI<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
    delete: (id: string, token: string) =>
      fetchAPI(`/projects/${id}`, { method: 'DELETE', token }),
  },
  requirements: {
    listByProject: (projectId: string, params?: any, token?: string) =>
      fetchAPI<{ data: Requirement[]; total: number; page: number; limit: number; totalPages: number }>(
        `/projects/${projectId}/requirements?${new URLSearchParams(params as any)}`, { token }),
    create: (projectId: string, data: any, token: string) =>
      fetchAPI<Requirement>(`/projects/${projectId}/requirements`, { method: 'POST', body: JSON.stringify(data), token }),
    get: (id: string, token: string) =>
      fetchAPI<Requirement>(`/requirements/${id}`, { token }),
    update: (id: string, data: any, token: string) =>
      fetchAPI<Requirement>(`/requirements/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
    delete: (id: string, token: string) =>
      fetchAPI(`/requirements/${id}`, { method: 'DELETE', token }),
    analyze: (id: string, token: string) =>
      fetchAPI<{ summary: string; suggestedTasks: string[]; estimatedComplexity: string; suggestedPriority: string }>(
        `/requirements/${id}/analyze`, { method: 'POST', token }),
    getAnalysis: (id: string, token: string) =>
      fetchAPI<{ analysis: any; created_at: string }>(`/requirements/${id}/analysis`, { token }),
  },
};

export default api;
