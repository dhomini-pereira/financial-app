import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import type { Account } from '../entities';

@injectable()
export class AccountRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async findAllByUser(userId: string): Promise<Account[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM accounts WHERE user_id = $1 ORDER BY created_at',
      [userId]
    );
    return rows;
  }

  async findById(id: string, userId: string): Promise<Account | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  async create(userId: string, data: { name: string; type: string; balance: number; color: string }): Promise<Account> {
    const { rows } = await this.pool.query(
      'INSERT INTO accounts (user_id, name, type, balance, color) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [userId, data.name, data.type, data.balance, data.color]
    );
    return rows[0];
  }

  async update(id: string, userId: string, data: Partial<{ name: string; type: string; balance: number; color: string }>): Promise<Account | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.type !== undefined) { fields.push(`type = $${idx++}`); values.push(data.type); }
    if (data.balance !== undefined) { fields.push(`balance = $${idx++}`); values.push(data.balance); }
    if (data.color !== undefined) { fields.push(`color = $${idx++}`); values.push(data.color); }

    if (fields.length === 0) return this.findById(id, userId);

    fields.push(`updated_at = NOW()`);
    values.push(id, userId);

    const { rows } = await this.pool.query(
      `UPDATE accounts SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }

  async updateBalance(id: string, delta: number, client?: any): Promise<void> {
    const db = client || this.pool;
    await db.query(
      'UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [delta, id]
    );
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM accounts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }
}
