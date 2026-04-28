# M2: Project Management and Requirements Module - Implementation Plan

## Overview

This plan covers the implementation of the Projects and Requirements modules for the AI Dev Platform, following a backend-first approach.

## Tech Stack
- **Backend**: Node.js + Express + TypeScript + PostgreSQL (pg driver)
- **Frontend**: Next.js 14 (Pages Router) + Tailwind CSS
- **Auth**: JWT middleware at `src/middleware/auth.ts`

## Database Schema

### Migration SQL
```sql
-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    github_repo VARCHAR(255),
    github_branch VARCHAR(100) DEFAULT 'main',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Requirements table
CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    tags JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'analyzing', 'analyzed', 'approved')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
```

---

## Backend Implementation

### File 1: Types - `/data/ai-dev-platform/src/types/index.ts`

Add to existing types:

```typescript
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
```

---

### File 2: ProjectService - `/data/ai-dev-platform/src/services/ProjectService.ts`

```typescript
import pool from '../database';
import { Project, CreateProjectDTO, UpdateProjectDTO, PaginatedResult, PaginationParams } from '../types';

export class ProjectService {
  async create(userId: string, data: CreateProjectDTO): Promise<Project> {
    const { name, description, github_repo, github_branch } = data;
    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description, github_repo, github_branch)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, description || null, github_repo || null, github_branch || 'main']
    );
    return result.rows[0];
  }

  async findAllByUser(
    userId: string,
    params: PaginationParams & { search?: string }
  ): Promise<PaginatedResult<Project>> {
    const { page, limit, search } = params;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const values: any[] = [userId];

    if (search) {
      whereClause += ` AND (name ILIKE $2 OR description ILIKE $2)`;
      values.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM projects ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM projects ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return {
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Project | null> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async update(id: string, userId: string, data: UpdateProjectDTO): Promise<Project | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.github_repo !== undefined) {
      fields.push(`github_repo = $${paramIndex++}`);
      values.push(data.github_repo);
    }
    if (data.github_branch !== undefined) {
      fields.push(`github_branch = $${paramIndex++}`);
      values.push(data.github_branch);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await pool.query(
      `UPDATE projects SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }
}

export const projectService = new ProjectService();
```

---

### File 3: RequirementService - `/data/ai-dev-platform/src/services/RequirementService.ts`

```typescript
import pool from '../database';
import { Requirement, CreateRequirementDTO, UpdateRequirementDTO, PaginatedResult, PaginationParams } from '../types';

export class RequirementService {
  async create(projectId: string, data: CreateRequirementDTO): Promise<Requirement> {
    const { title, content, priority = 'medium', tags = [] } = data;
    const result = await pool.query(
      `INSERT INTO requirements (project_id, title, content, priority, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [projectId, title, content, priority, JSON.stringify(tags)]
    );
    return result.rows[0];
  }

  async findAllByProject(
    projectId: string,
    params: PaginationParams & { search?: string; status?: string }
  ): Promise<PaginatedResult<Requirement>> {
    const { page, limit, search, status } = params;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE project_id = $1';
    const values: any[] = [projectId];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      values.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM requirements ${whereClause}`,
      values
    );
    const total = parseInt(countResult.rows[0].count);

    values.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM requirements ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length - 1} OFFSET $${values.length}`,
      values
    );

    return {
      data: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Requirement | null> {
    const result = await pool.query(
      'SELECT * FROM requirements WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async update(id: string, data: UpdateRequirementDTO): Promise<Requirement | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(data.title);
    }
    if (data.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(data.content);
    }
    if (data.priority !== undefined) {
      fields.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }
    if (data.tags !== undefined) {
      fields.push(`tags = $${paramIndex++}`);
      values.push(JSON.stringify(data.tags));
    }

    // Status always resets to draft on update
    fields.push(`status = 'draft'`);
    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    values.push(id);

    const result = await pool.query(
      `UPDATE requirements SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM requirements WHERE id = $1 RETURNING id',
      [id]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async findByIdWithProject(id: string): Promise<(Requirement & { project_user_id: string }) | null> {
    const result = await pool.query(
      `SELECT r.*, p.user_id as project_user_id
       FROM requirements r
       JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }
}

export const requirementService = new RequirementService();
```

---

### File 4: ProjectController - `/data/ai-dev-platform/src/controllers/ProjectController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/ProjectService';

export class ProjectController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { name, description, github_repo, github_branch } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Project name is required' });
        return;
      }

      const project = await projectService.create(userId, {
        name: name.trim(),
        description,
        github_repo,
        github_branch,
      });

      res.status(201).json(project);
    } catch (error) {
      next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const search = req.query.search as string;

      const result = await projectService.findAllByUser(userId, { page, limit, search });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const project = await projectService.findById(id);

      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(project);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { name, description, github_repo, github_branch } = req.body;

      const existing = await projectService.findById(id);
      if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (existing.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const project = await projectService.update(id, userId, {
        name: name?.trim(),
        description,
        github_repo,
        github_branch,
      });

      res.json(project);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const existing = await projectService.findById(id);
      if (!existing) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (existing.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await projectService.delete(id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const projectController = new ProjectController();
```

---

### File 5: RequirementController - `/data/ai-dev-platform/src/controllers/RequirementController.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { requirementService } from '../services/RequirementService';
import { projectService } from '../services/ProjectService';

export class RequirementController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { projectId } = req.params;
      const { title, content, priority, tags } = req.body;

      if (!title || typeof title !== 'string' || title.trim().length === 0) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      const project = await projectService.findById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const requirement = await requirementService.create(projectId, {
        title: title.trim(),
        content: content.trim(),
        priority,
        tags,
      });

      res.status(201).json(requirement);
    } catch (error) {
      next(error);
    }
  }

  async listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { projectId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const search = req.query.search as string;
      const status = req.query.status as string;

      const project = await projectService.findById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      if (project.user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const result = await requirementService.findAllByProject(projectId, {
        page,
        limit,
        search,
        status,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const requirement = await requirementService.findByIdWithProject(id);

      if (!requirement) {
        res.status(404).json({ error: 'Requirement not found' });
        return;
      }

      if (requirement.project_user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const { project_user_id, ...result } = requirement;
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      const { title, content, priority, tags } = req.body;

      const requirement = await requirementService.findByIdWithProject(id);

      if (!requirement) {
        res.status(404).json({ error: 'Requirement not found' });
        return;
      }

      if (requirement.project_user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const updated = await requirementService.update(id, {
        title: title?.trim(),
        content: content?.trim(),
        priority,
        tags,
      });

      res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      const requirement = await requirementService.findByIdWithProject(id);

      if (!requirement) {
        res.status(404).json({ error: 'Requirement not found' });
        return;
      }

      if (requirement.project_user_id !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await requirementService.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

export const requirementController = new RequirementController();
```

---

### File 6: Project Routes - `/data/ai-dev-platform/src/routes/projects.ts`

```typescript
import { Router } from 'express';
import { projectController } from '../controllers/ProjectController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => projectController.list(req, res, next));
router.post('/', (req, res, next) => projectController.create(req, res, next));
router.get('/:id', (req, res, next) => projectController.getById(req, res, next));
router.put('/:id', (req, res, next) => projectController.update(req, res, next));
router.delete('/:id', (req, res, next) => projectController.delete(req, res, next));

export default router;
```

---

### File 7: Requirement Routes - `/data/ai-dev-platform/src/routes/requirements.ts`

```typescript
import { Router } from 'express';
import { requirementController } from '../controllers/RequirementController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.get('/projects/:projectId/requirements', (req, res, next) =>
  requirementController.listByProject(req, res, next)
);
router.post('/projects/:projectId/requirements', (req, res, next) =>
  requirementController.create(req, res, next)
);
router.get('/:id', (req, res, next) => requirementController.getById(req, res, next));
router.put('/:id', (req, res, next) => requirementController.update(req, res, next));
router.delete('/:id', (req, res, next) => requirementController.delete(req, res, next));

export default router;
```

---

### File 8: Update Routes Index - `/data/ai-dev-platform/src/routes/index.ts`

```typescript
import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './user';
import projectRoutes from './projects';
import requirementRoutes from './requirements';

const router = Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/projects', projectRoutes);
router.use('/requirements', requirementRoutes);

export default router;
```

---

### File 9: Update Database - `/data/ai-dev-platform/src/database/index.ts`

Add after existing tables:

```typescript
    // Projects table
    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        github_repo VARCHAR(255),
        github_branch VARCHAR(100) DEFAULT 'main',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Requirements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS requirements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
        tags JSONB DEFAULT '[]',
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'analyzing', 'analyzed', 'approved')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_requirements_project_id ON requirements(project_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status)`);
```

---

## Frontend Implementation

### File 10: API Client - `/data/ai-dev-platform/frontend/src/utils/api.ts`

```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

async function fetchAPI<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  projects: {
    list: (params?: { page?: number; limit?: number; search?: string }, token?: string) =>
      fetchAPI<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
        `/projects?${new URLSearchParams(params as any)}`,
        { token }
      ),
    create: (data: any, token: string) =>
      fetchAPI('/projects', { method: 'POST', body: JSON.stringify(data), token }),
    get: (id: string, token: string) =>
      fetchAPI(`/projects/${id}`, { token }),
    update: (id: string, data: any, token: string) =>
      fetchAPI(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
    delete: (id: string, token: string) =>
      fetchAPI(`/projects/${id}`, { method: 'DELETE', token }),
  },

  requirements: {
    listByProject: (projectId: string, params?: { page?: number; limit?: number; search?: string; status?: string }, token?: string) =>
      fetchAPI<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
        `/projects/${projectId}/requirements?${new URLSearchParams(params as any)}`,
        { token }
      ),
    create: (projectId: string, data: any, token: string) =>
      fetchAPI(`/projects/${projectId}/requirements`, { method: 'POST', body: JSON.stringify(data), token }),
    get: (id: string, token: string) =>
      fetchAPI(`/requirements/${id}`, { token }),
    update: (id: string, data: any, token: string) =>
      fetchAPI(`/requirements/${id}`, { method: 'PUT', body: JSON.stringify(data), token }),
    delete: (id: string, token: string) =>
      fetchAPI(`/requirements/${id}`, { method: 'DELETE', token }),
  },
};

export default api;
```

---

### File 11: ProjectCard - `/data/ai-dev-platform/frontend/src/components/projects/ProjectCard.tsx`

```tsx
import React from 'react';

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description?: string;
    github_repo?: string;
    github_branch?: string;
    created_at: string;
  };
  onEdit?: (project: any) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export default function ProjectCard({ project, onEdit, onDelete, onView }: ProjectCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3
          className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-blue-600"
          onClick={() => onView?.(project.id)}
        >
          {project.name}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit?.(project)}
            className="text-gray-500 hover:text-blue-600 p-1"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete?.(project.id)}
            className="text-gray-500 hover:text-red-600 p-1"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {project.description && (
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{project.description}</p>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-500">
        {project.github_repo && (
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            {project.github_repo}
          </span>
        )}
        {project.github_branch && (
          <span>Branch: {project.github_branch}</span>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-400">
        Created: {new Date(project.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
```

---

### File 12: ProjectForm - `/data/ai-dev-platform/frontend/src/components/projects/ProjectForm.tsx`

```tsx
import React, { useState } from 'react';

interface ProjectFormProps {
  project?: {
    id?: string;
    name: string;
    description?: string;
    github_repo?: string;
    github_branch?: string;
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function ProjectForm({ project, onSubmit, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState({
    name: project?.name || '',
    description: project?.description || '',
    github_repo: project?.github_repo || '',
    github_branch: project?.github_branch || 'main',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(formData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Project Name *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="My Awesome Project"
        />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Project description (optional)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          GitHub Repository
        </label>
        <input
          type="text"
          value={formData.github_repo}
          onChange={(e) => setFormData({ ...formData, github_repo: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="owner/repo"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          GitHub Branch
        </label>
        <input
          type="text"
          value={formData.github_branch}
          onChange={(e) => setFormData({ ...formData, github_branch: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="main"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : project?.id ? 'Update' : 'Create'} Project
        </button>
      </div>
    </form>
  );
}
```

---

### File 13: ProjectList - `/data/ai-dev-platform/frontend/src/components/projects/ProjectList.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import ProjectCard from './ProjectCard';
import ProjectForm from './ProjectForm';
import api from '../../utils/api';

interface ProjectListProps {
  token: string;
}

export default function ProjectList({ token }: ProjectListProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const result = await api.projects.list({ page, limit: 9, search }, token);
      setProjects(result.data);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [page, token]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      fetchProjects();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleCreate = async (data: any) => {
    await api.projects.create(data, token);
    setShowForm(false);
    fetchProjects();
  };

  const handleUpdate = async (data: any) => {
    await api.projects.update(editingProject.id, data, token);
    setEditingProject(null);
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure? This will delete all requirements in this project.')) {
      await api.projects.delete(id, token);
      fetchProjects();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Project
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search projects..."
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {search ? 'No projects match your search' : 'No projects yet. Create your first project!'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={(p) => setEditingProject(p)}
                onDelete={handleDelete}
                onView={(id) => window.location.href = `/projects/${id}`}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {(showForm || editingProject) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {editingProject ? 'Edit Project' : 'Create New Project'}
            </h2>
            <ProjectForm
              project={editingProject}
              onSubmit={editingProject ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditingProject(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### File 14: RequirementCard - `/data/ai-dev-platform/frontend/src/components/requirements/RequirementCard.tsx`

```tsx
import React from 'react';

interface RequirementCardProps {
  requirement: {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high';
    tags: string[];
    status: 'draft' | 'analyzing' | 'analyzed' | 'approved';
    created_at: string;
  };
  onEdit?: (requirement: any) => void;
  onDelete?: (id: string) => void;
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-700',
};

const statusColors = {
  draft: 'bg-gray-100 text-gray-600',
  analyzing: 'bg-blue-100 text-blue-600',
  analyzed: 'bg-purple-100 text-purple-600',
  approved: 'bg-green-100 text-green-600',
};

export default function RequirementCard({ requirement, onEdit, onDelete }: RequirementCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-5 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-lg font-semibold text-gray-900">{requirement.title}</h3>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit?.(requirement)}
            className="text-gray-500 hover:text-blue-600 p-1"
            title="Edit"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete?.(requirement.id)}
            className="text-gray-500 hover:text-red-600 p-1"
            title="Delete"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mb-3">
        <span className={`inline-block px-2 py-1 text-xs rounded mr-2 ${priorityColors[requirement.priority]}`}>
          {requirement.priority}
        </span>
        <span className={`inline-block px-2 py-1 text-xs rounded ${statusColors[requirement.status]}`}>
          {requirement.status}
        </span>
      </div>

      <p className="text-gray-600 text-sm mb-3 line-clamp-3 whitespace-pre-wrap">
        {requirement.content}
      </p>

      {requirement.tags && requirement.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {requirement.tags.map((tag, index) => (
            <span key={index} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="text-xs text-gray-400">
        Created: {new Date(requirement.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
```

---

### File 15: RequirementForm - `/data/ai-dev-platform/frontend/src/components/requirements/RequirementForm.tsx`

```tsx
import React, { useState } from 'react';

interface RequirementFormProps {
  requirement?: {
    id?: string;
    title: string;
    content: string;
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
  };
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

export default function RequirementForm({ requirement, onSubmit, onCancel }: RequirementFormProps) {
  const [formData, setFormData] = useState({
    title: requirement?.title || '',
    content: requirement?.content || '',
    priority: requirement?.priority || 'medium',
    tags: requirement?.tags?.join(', ') || '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const tagsArray = formData.tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await onSubmit({
        ...formData,
        tags: tagsArray,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`w-full px-3 py-2 border rounded-md ${
            errors.title ? 'border-red-500' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="Requirement title"
        />
        {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Content (Markdown) *
        </label>
        <textarea
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={8}
          className={`w-full px-3 py-2 border rounded-md font-mono text-sm ${
            errors.content ? 'border-red-500' : 'border-gray-300'
          } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          placeholder="Describe the requirement in detail using Markdown..."
        />
        {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Priority
        </label>
        <select
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags (comma-separated)
        </label>
        <input
          type="text"
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="frontend, api, auth"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : requirement?.id ? 'Update' : 'Create'} Requirement
        </button>
      </div>
    </form>
  );
}
```

---

### File 16: RequirementList - `/data/ai-dev-platform/frontend/src/components/requirements/RequirementList.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import RequirementCard from './RequirementCard';
import RequirementForm from './RequirementForm';
import api from '../../utils/api';

interface RequirementListProps {
  projectId: string;
  token: string;
}

export default function RequirementList({ projectId, token }: RequirementListProps) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [showForm, setShowForm] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<any>(null);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      const result = await api.requirements.listByProject(
        projectId,
        { page, limit: 9, search, status: statusFilter || undefined },
        token
      );
      setRequirements(result.data);
      setTotalPages(result.totalPages);
      setError(null);
    } catch (err) {
      setError('Failed to load requirements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, [page, projectId, token]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      setPage(1);
      fetchRequirements();
    }, 300);
    return () => clearTimeout(debounce);
  }, [search, statusFilter]);

  const handleCreate = async (data: any) => {
    await api.requirements.create(projectId, data, token);
    setShowForm(false);
    fetchRequirements();
  };

  const handleUpdate = async (data: any) => {
    await api.requirements.update(editingRequirement.id, data, token);
    setEditingRequirement(null);
    fetchRequirements();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this requirement?')) {
      await api.requirements.delete(id, token);
      fetchRequirements();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Requirements</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + New Requirement
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search requirements..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="analyzing">Analyzing</option>
          <option value="analyzed">Analyzed</option>
          <option value="approved">Approved</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-10 text-gray-500">Loading requirements...</div>
      ) : requirements.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {search || statusFilter
            ? 'No requirements match your filters'
            : 'No requirements yet. Create your first requirement!'}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {requirements.map((req) => (
              <RequirementCard
                key={req.id}
                requirement={req}
                onEdit={(r) => setEditingRequirement(r)}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-3 py-1">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {(showForm || editingRequirement) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full my-8">
            <h2 className="text-xl font-bold mb-4">
              {editingRequirement ? 'Edit Requirement' : 'Create New Requirement'}
            </h2>
            <RequirementForm
              requirement={editingRequirement}
              onSubmit={editingRequirement ? handleUpdate : handleCreate}
              onCancel={() => {
                setShowForm(false);
                setEditingRequirement(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### File 17: Update Layout - `/data/ai-dev-platform/frontend/src/app/layout.tsx`

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppProps } from 'next/app';
import '../app/globals.css';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  user: any | null;
  setUser: (user: any | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  user: null,
  setUser: () => {},
});

export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUserState] = useState<any | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setTokenState(savedToken);
      setUserState(JSON.parse(savedUser));
    }
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      localStorage.setItem('token', newToken);
    } else {
      localStorage.removeItem('token');
    }
  };

  const setUser = (newUser: any | null) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem('user', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ token, setToken, user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

function Navigation({ token, onLogout }: { token: string | null; onLogout: () => void }) {
  return (
    <nav className="bg-gray-800 text-white px-6 py-3">
      <div className="flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-6">
          <a href="/" className="text-xl font-bold">AI Dev Platform</a>
          {token && (
            <div className="flex gap-4">
              <a href="/" className="hover:text-gray-300">Projects</a>
            </div>
          )}
        </div>
        {token && (
          <button
            onClick={onLogout}
            className="px-4 py-1.5 bg-gray-700 rounded hover:bg-gray-600"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <LayoutContent {...pageProps} />
    </AuthProvider>
  );
}

function LayoutContent({ ...pageProps }: AppProps['pageProps']) {
  const { token, setToken, user, setUser } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  if (!mounted) return null;

  return (
    <>
      <Navigation token={token} onLogout={handleLogout} />
      <Component {...pageProps} />
    </>
  );
}
```

---

### File 18: Update Page - `/data/ai-dev-platform/frontend/src/app/page.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './layout';
import ProjectList from '../components/projects/ProjectList';
import LoginForm from '../components/LoginForm';

export default function Home() {
  const { token, user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h1 className="text-2xl font-bold text-center mb-6">AI Dev Platform</h1>
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <ProjectList token={token} />
    </div>
  );
}
```

---

## Implementation Tasks

| # | Task | Duration | Files |
|---|------|----------|-------|
| 1 | Add database tables | 2 min | src/database/index.ts |
| 2 | Add TypeScript types | 2 min | src/types/index.ts |
| 3 | Create ProjectService | 5 min | src/services/ProjectService.ts |
| 4 | Create RequirementService | 5 min | src/services/RequirementService.ts |
| 5 | Create ProjectController | 3 min | src/controllers/ProjectController.ts |
| 6 | Create RequirementController | 3 min | src/controllers/RequirementController.ts |
| 7 | Create routes files | 2 min | src/routes/projects.ts, requirements.ts |
| 8 | Update routes index | 1 min | src/routes/index.ts |
| 9 | Create API client | 3 min | frontend/src/utils/api.ts |
| 10 | Create frontend components | 15 min | frontend/src/components/ |
| 11 | Update layout and page | 3 min | frontend/src/app/ |
| 12 | Deploy and test | 5 min | - |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/projects | List projects (paginated) |
| POST | /api/projects | Create project |
| GET | /api/projects/:id | Get project |
| PUT | /api/projects/:id | Update project |
| DELETE | /api/projects/:id | Delete project |
| GET | /api/projects/:projectId/requirements | List requirements |
| POST | /api/projects/:projectId/requirements | Create requirement |
| GET | /api/requirements/:id | Get requirement |
| PUT | /api/requirements/:id | Update requirement |
| DELETE | /api/requirements/:id | Delete requirement |

All endpoints require JWT authentication.
