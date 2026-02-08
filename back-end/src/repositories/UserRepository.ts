import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import type { User } from '../entities';

@injectable()
export class UserRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async findById(id: string): Promise<User | null> {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0] ?? null;
  }

  async create(name: string, email: string, passwordHash: string): Promise<User> {
    const { rows } = await this.pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
      [name, email, passwordHash]
    );
    return rows[0];
  }

  async update(id: string, data: { name?: string; email?: string }): Promise<User | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.email) { fields.push(`email = $${idx++}`); values.push(data.email); }

    if (fields.length === 0) return this.findById(id);

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await this.pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }
}
