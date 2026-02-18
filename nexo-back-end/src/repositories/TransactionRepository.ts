import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import type { Transaction } from '../entities';

@injectable()
export class TransactionRepository {
  constructor(@inject('DatabasePool') private pool: Pool) {}

  async findAllByUser(userId: string): Promise<Transaction[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC, created_at DESC',
      [userId]
    );
    return rows;
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const { rows } = await this.pool.query(
      'SELECT * FROM transactions WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  async create(
    userId: string,
    data: {
      account_id: string;
      category_id: string | null;
      description: string;
      amount: number;
      type: string;
      date: string;
      recurring: boolean;
      recurrence?: string | null;
      next_due_date?: string | null;
      recurrence_count?: number | null;
      recurrence_current?: number;
      recurrence_group_id?: string | null;
    },
    client?: any
  ): Promise<Transaction> {
    const db = client || this.pool;
    const { rows } = await db.query(
      `INSERT INTO transactions (user_id, account_id, category_id, description, amount, type, date, recurring, recurrence, next_due_date, recurrence_count, recurrence_current, recurrence_group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [userId, data.account_id, data.category_id, data.description, data.amount, data.type, data.date, data.recurring, data.recurrence ?? null, data.next_due_date ?? null, data.recurrence_count ?? null, data.recurrence_current ?? 0, data.recurrence_group_id ?? null]
    );
    return rows[0];
  }

  async update(id: string, userId: string, data: Partial<{
    description: string; amount: number; type: string; category_id: string;
    account_id: string; date: string; recurring: boolean; recurrence: string | null;
    next_due_date: string | null; recurrence_paused: boolean;
  }>): Promise<Transaction | null> {
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

    values.push(id, userId);
    const { rows } = await this.pool.query(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values
    );
    return rows[0] ?? null;
  }

  async delete(id: string, userId: string): Promise<Transaction | null> {
    const { rows } = await this.pool.query(
      'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return rows[0] ?? null;
  }

  /** Busca todas as transações recorrentes cuja next_due_date <= hoje (não pausadas) */
  async findDueRecurring(today: string): Promise<Transaction[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM transactions WHERE recurring = true AND next_due_date IS NOT NULL AND next_due_date <= $1 AND (recurrence_paused IS NULL OR recurrence_paused = false)`,
      [today]
    );
    return rows;
  }

  /** Busca transações filhas geradas por uma recorrência (group_id = parentId) */
  async findByGroupId(parentId: string, userId: string): Promise<Transaction[]> {
    const { rows } = await this.pool.query(
      'SELECT * FROM transactions WHERE recurrence_group_id = $1 AND user_id = $2 ORDER BY date ASC',
      [parentId, userId]
    );
    return rows;
  }

  /** Atualiza o next_due_date de uma transação recorrente (sem filtro de user) */
  async updateNextDueDate(id: string, nextDueDate: string, client?: any): Promise<void> {
    const db = client || this.pool;
    await db.query(
      'UPDATE transactions SET next_due_date = $1 WHERE id = $2',
      [nextDueDate, id]
    );
  }
}
