import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import type { SharedAccount } from '../entities';

@injectable()
export class SharedAccountRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async findByOwner(userId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT sa.*, u.name AS shared_with_user_name, u.email AS shared_with_user_email, a.name AS account_name
       FROM shared_accounts sa
       JOIN users u ON u.id = sa.shared_with_user_id
       JOIN accounts a ON a.id = sa.account_id
       WHERE sa.owner_id = $1
       ORDER BY sa.created_at DESC`,
      [userId]
    );
    return rows;
  }

  async findBySharedUser(userId: string): Promise<any[]> {
    const { rows } = await this.pool.query(
      `SELECT sa.*, u.name AS owner_name, u.email AS owner_email, a.name AS account_name, a.balance, a.color, a.type
       FROM shared_accounts sa
       JOIN users u ON u.id = sa.owner_id
       JOIN accounts a ON a.id = sa.account_id
       WHERE sa.shared_with_user_id = $1
       ORDER BY sa.created_at DESC`,
      [userId]
    );
    return rows;
  }

  async invite(ownerId: string, sharedWithUserId: string, accountId: string): Promise<SharedAccount> {
    const { rows } = await this.pool.query(
      `INSERT INTO shared_accounts (owner_id, shared_with_user_id, account_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [ownerId, sharedWithUserId, accountId]
    );
    return rows[0];
  }

  async findById(id: string, ownerId: string): Promise<SharedAccount | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM shared_accounts WHERE id = $1 AND owner_id = $2',
      [id, ownerId]
    );
    return rows[0] ?? null;
  }

  async delete(id: string, ownerId: string): Promise<boolean> {
    const { rowCount } = await this.pool.query(
      'DELETE FROM shared_accounts WHERE id = $1 AND owner_id = $2',
      [id, ownerId]
    );
    return (rowCount ?? 0) > 0;
  }

  async getSharedTransactions(accountId: string, ownerId: string, sharedWithUserId: string): Promise<any[]> {
    // Verify the share exists
    const { rows: share } = await this.pool.query(
      'SELECT * FROM shared_accounts WHERE account_id = $1 AND owner_id = $2 AND shared_with_user_id = $3',
      [accountId, ownerId, sharedWithUserId]
    );
    if (!share[0]) return [];

    const { rows } = await this.pool.query(
      `SELECT t.*, c.name AS category_name, c.icon AS category_icon
       FROM transactions t
       LEFT JOIN categories c ON c.id = t.category_id
       WHERE t.account_id = $1 AND t.user_id = $2
       ORDER BY t.date DESC, t.created_at DESC
       LIMIT 100`,
      [accountId, ownerId]
    );
    return rows;
  }
}
