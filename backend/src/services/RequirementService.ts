import { pool } from '../database';
import { Requirement, CreateRequirementDTO, UpdateRequirementDTO, PaginatedResult } from '../types';

export class RequirementService {
  async create(projectId: string, data: CreateRequirementDTO): Promise<Requirement> {
    const result = await pool.query(
      `INSERT INTO requirements (project_id, title, content, priority, tags)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        projectId,
        data.title,
        data.content,
        data.priority || 'medium',
        data.tags || [],
      ]
    );
    return this.mapToRequirement(result.rows[0]);
  }

  async findAllByProject(
    projectId: string,
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string
  ): Promise<PaginatedResult<Requirement>> {
    const offset = (page - 1) * limit;
    const conditions = ['project_id = $1'];
    const params: any[] = [projectId];
    let paramIndex = 2;

    if (search) {
      conditions.push(`(title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM requirements WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT * FROM requirements WHERE ${whereClause}
       ORDER BY
         CASE WHEN status = 'draft' THEN 0
              WHEN status = 'analyzing' THEN 1
              WHEN status = 'analyzed' THEN 2
              ELSE 3 END,
         created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      params
    );

    return {
      data: result.rows.map(this.mapToRequirement),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string): Promise<Requirement | null> {
    const result = await pool.query('SELECT * FROM requirements WHERE id = $1', [id]);
    return result.rows[0] ? this.mapToRequirement(result.rows[0]) : null;
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
      values.push(data.tags);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(
      `UPDATE requirements SET ${fields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0] ? this.mapToRequirement(result.rows[0]) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM requirements WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async checkProjectOwnership(projectId: string, userId: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, userId]
    );
    return result.rows.length > 0;
  }

  private mapToRequirement(row: any): Requirement {
    return {
      id: row.id,
      project_id: row.project_id,
      title: row.title,
      content: row.content,
      priority: row.priority,
      tags: row.tags || [],
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const requirementService = new RequirementService();
