import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import type { Investment } from '../entities';

@injectable()
export class InvestmentRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async findAllByUser(userId: string): Promise<Investment[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM investments WHERE user_id = $1 ORDER BY created_at',
      [userId]
    );
    return rows;
  }

  async findById(id: string, userId: string): Promise<Investment | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM investments WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  async create(userId: string, data: {
    name: string; type: string; principal: number;
    current_value: number; return_rate: number; start_date: string;
  }): Promise<Investment> {
    const { rows } = await this.pool.query(
      `INSERT INTO investments (user_id, name, type, principal, current_value, return_rate, start_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [userId, data.name, data.type, data.principal, data.current_value, data.return_rate, data.start_date]
    );
    return rows[0];
  }

  async update(id: string, userId: string, data: Partial<{
    name: string; type: string; principal: number;
    current_value: number; return_rate: number; start_date: string;
  }>): Promise<Investment | null> {
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
      `UPDATE investments SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM investments WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }
}
