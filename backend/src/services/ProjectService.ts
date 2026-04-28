import { pool } from '../database';
import { Project, CreateProjectDTO, UpdateProjectDTO, PaginatedResult } from '../types';

export class ProjectService {
  async create(userId: string, data: CreateProjectDTO): Promise<Project> {
    const result = await pool.query(
      `INSERT INTO projects (user_id, name, description, github_repo, github_branch)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, data.name, data.description || null, data.github_repo || null, data.github_branch || 'main']
    );
    return this.mapToProject(result.rows[0]);
  }

  async findAllByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
    search?: string
  ): Promise<PaginatedResult<Project>> {
    const offset = (page - 1) * limit;
    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId];

    if (search) {
      whereClause += ` AND (name ILIKE $2 OR description ILIKE $2)`;
      params.push(`%${search}%`);
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM projects ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataResult = await pool.query(
      `SELECT * FROM projects ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      [userId, ...(search ? [`%${search}%`] : []), limit, offset]
    );

    return {
      data: dataResult.rows.map(this.mapToProject),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, userId: string): Promise<Project | null> {
    const result = await pool.query(
      'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return result.rows[0] ? this.mapToProject(result.rows[0]) : null;
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
      return this.findById(id, userId);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id, userId);

    const result = await pool.query(
      `UPDATE projects SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] ? this.mapToProject(result.rows[0]) : null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  private mapToProject(row: any): Project {
    return {
      id: row.id,
      user_id: row.user_id,
      name: row.name,
      description: row.description,
      github_repo: row.github_repo,
      github_branch: row.github_branch,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const projectService = new ProjectService();
