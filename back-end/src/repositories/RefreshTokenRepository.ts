import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import type { RefreshToken } from '../entities';

@injectable()
export class RefreshTokenRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async create(userId: string, token: string, expiresAt: Date): Promise<RefreshToken> {
    const { rows } = await this.pool.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3) RETURNING *',
      [userId, token, expiresAt]
    );
    return rows[0];
  }

  async findByToken(token: string): Promise<RefreshToken | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    return rows[0] ?? null;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.pool.query('DELETE FROM refresh_tokens WHERE token = $1', [token]);
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
  }

  async deleteExpired(): Promise<void> {
    await this.pool.query('DELETE FROM refresh_tokens WHERE expires_at <= NOW()');
  }
}
