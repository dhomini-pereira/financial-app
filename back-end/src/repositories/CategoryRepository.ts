import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import type { Category } from '../entities';

@injectable()
export class CategoryRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async findAllByUser(userId: string): Promise<Category[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM categories WHERE user_id = $1 ORDER BY type, name',
      [userId]
    );
    return rows;
  }

  async findById(id: string, userId: string): Promise<Category | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM categories WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  async create(userId: string, data: { name: string; icon: string; type: string }): Promise<Category> {
    const { rows } = await this.pool.query(
      'INSERT INTO categories (user_id, name, icon, type) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, data.name, data.icon, data.type]
    );
    return rows[0];
  }

  async createMany(userId: string, categories: { name: string; icon: string; type: string }[]): Promise<void> {
    if (categories.length === 0) return;
    const values: any[] = [];
    const placeholders: string[] = [];
    let idx = 1;

    for (const cat of categories) {
      placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++})`);
      values.push(userId, cat.name, cat.icon, cat.type);
    }

    await this.pool.query(
      `INSERT INTO categories (user_id, name, icon, type) VALUES ${placeholders.join(', ')}`,
      values
    );
  }

  async update(id: string, userId: string, data: Partial<{ name: string; icon: string; type: string }>): Promise<Category | null> {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
    if (data.icon !== undefined) { fields.push(`icon = $${idx++}`); values.push(data.icon); }
    if (data.type !== undefined) { fields.push(`type = $${idx++}`); values.push(data.type); }

    if (fields.length === 0) return this.findById(id, userId);

    values.push(id, userId);
    const { rows } = await this.pool.query(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM categories WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }
}
