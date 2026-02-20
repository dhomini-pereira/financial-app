import { injectable, inject } from "tsyringe";
import { Pool } from "pg";
import type { CreditCard, CreditCardInvoice } from "../entities";

@injectable()
export class CreditCardRepository {
  constructor(@inject("DatabasePool") private pool: Pool) {}

  async findAllByUser(userId: string): Promise<CreditCard[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM credit_cards WHERE user_id = $1 ORDER BY name ASC",
      [userId],
    );
    return rows;
  }

  async findById(id: string, userId: string): Promise<CreditCard | null> {
    const { rows } = await this.pool.query(
      "SELECT * FROM credit_cards WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async create(
    userId: string,
    data: {
      name: string;
      card_limit: number;
      closing_day: number;
      due_day: number;
      best_purchase_day?: number | null;
      color: string;
    },
  ): Promise<CreditCard> {
    const { rows } = await this.pool.query(
      `INSERT INTO credit_cards (user_id, name, card_limit, closing_day, due_day, best_purchase_day, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        userId,
        data.name,
        data.card_limit,
        data.closing_day,
        data.due_day,
        data.best_purchase_day ?? null,
        data.color,
      ],
    );
    return rows[0];
  }

  async update(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      card_limit: number;
      closing_day: number;
      due_day: number;
      best_purchase_day: number | null;
      color: string;
    }>,
  ): Promise<CreditCard | null> {
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
      `UPDATE credit_cards SET ${fields.join(", ")} WHERE id = $${idx++} AND user_id = $${idx} RETURNING *`,
      values,
    );
    return rows[0] ?? null;
  }

  async delete(id: string, userId: string): Promise<CreditCard | null> {
    const { rows } = await this.pool.query(
      "DELETE FROM credit_cards WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId],
    );
    return rows[0] ?? null;
  }

  async findInvoicesByCard(
    cardId: string,
    userId: string,
  ): Promise<CreditCardInvoice[]> {
    const { rows } = await this.pool.query(
      "SELECT * FROM credit_card_invoices WHERE credit_card_id = $1 AND user_id = $2 ORDER BY reference_month DESC",
      [cardId, userId],
    );
    return rows;
  }

  async findInvoice(
    cardId: string,
    referenceMonth: string,
    userId: string,
  ): Promise<CreditCardInvoice | null> {
    const { rows } = await this.pool.query(
      "SELECT * FROM credit_card_invoices WHERE credit_card_id = $1 AND reference_month = $2 AND user_id = $3",
      [cardId, referenceMonth, userId],
    );
    return rows[0] ?? null;
  }

  async upsertInvoice(
    cardId: string,
    userId: string,
    referenceMonth: string,
    amount: number,
  ): Promise<CreditCardInvoice> {
    const { rows } = await this.pool.query(
      `INSERT INTO credit_card_invoices (credit_card_id, user_id, reference_month, total)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (credit_card_id, reference_month) DO UPDATE SET total = credit_card_invoices.total + $4
       RETURNING *`,
      [cardId, userId, referenceMonth, amount],
    );
    return rows[0];
  }

  async subtractFromInvoice(
    cardId: string,
    referenceMonth: string,
    amount: number,
    client?: any,
  ): Promise<void> {
    const db = client || this.pool;
    await db.query(
      `UPDATE credit_card_invoices SET total = GREATEST(0, total - $1) WHERE credit_card_id = $2 AND reference_month = $3`,
      [amount, cardId, referenceMonth],
    );
  }

  async payInvoice(
    invoiceId: string,
    userId: string,
    accountId: string,
    client?: any,
  ): Promise<CreditCardInvoice | null> {
    const db = client || this.pool;
    const { rows } = await db.query(
      `UPDATE credit_card_invoices SET paid = true, paid_at = NOW(), paid_with_account_id = $1
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [accountId, invoiceId, userId],
    );
    return rows[0] ?? null;
  }

  async getUsedAmount(cardId: string): Promise<number> {
    const { rows } = await this.pool.query(
      "SELECT COALESCE(SUM(total), 0) AS used FROM credit_card_invoices WHERE credit_card_id = $1 AND paid = false",
      [cardId],
    );
    return Number(rows[0].used);
  }
}
