import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';

@injectable()
export class FamilyMemberRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async findAllByUser(userId: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM family_members WHERE user_id = $1 ORDER BY name ASC',
      [userId]
    );
    return rows;
  }

  async findById(id: string, userId: string) {
    const { rows } = await this.pool.query(
      'SELECT * FROM family_members WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  async create(userId: string, name: string) {
    const { rows } = await this.pool.query(
      'INSERT INTO family_members (user_id, name) VALUES ($1, $2) RETURNING *',
      [userId, name]
    );
    return rows[0];
  }

  async update(id: string, userId: string, name: string) {
    const { rows } = await this.pool.query(
      'UPDATE family_members SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [name, id, userId]
    );
    return rows[0] ?? null;
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM family_members WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return (rowCount ?? 0) > 0;
  }
}
