import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import type { Goal } from '../entities';

@injectable()
export class GoalRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async findAllByUser(userId: string): Promise<Goal[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at',
      [userId]
    );
    return rows;
  }

  async findById(id: string, userId: string): Promise<Goal | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM goals WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  async create(userId: string, data: {
    name: string; target_amount: number; current_amount: number;
    deadline: string | null; icon: string;
  }): Promise<Goal> {
    const { rows } = await this.pool.query(
      `INSERT INTO goals (user_id, name, target_amount, current_amount, deadline, icon)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [userId, data.name, data.target_amount, data.current_amount, data.deadline, data.icon]
    );
    return rows[0];
  }

  async update(id: string, userId: string, data: Partial<{
    name: string; target_amount: number; current_amount: number;
    deadline: string | null; icon: string;
  }>): Promise<Goal | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const [key, val] of Object.entries(data)) {
      if (val !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }
    if (fields.length === 0) return this.findById(id, userId);

    fields.push(`updated_at = NOW()`);
    values.push(id, userId);
    const { rows } = await this.pool.query(
      `UPDATE goals SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }
}
