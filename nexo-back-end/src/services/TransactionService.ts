import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import type { TransactionDTO } from '../entities';

function addRecurrence(dateStr: string, recurrence: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  switch (recurrence) {
    case 'daily':   d.setUTCDate(d.getUTCDate() + 1); break;
    case 'weekly':  d.setUTCDate(d.getUTCDate() + 7); break;
    case 'monthly': d.setUTCMonth(d.getUTCMonth() + 1); break;
    case 'yearly':  d.setUTCFullYear(d.getUTCFullYear() + 1); break;
  }
  return d.toISOString().split('T')[0];
}

@injectable()
export class TransactionService {
  constructor(
    @inject('TransactionRepository') private txRepo: TransactionRepository,
    @inject('AccountRepository') private accountRepo: AccountRepository,
    @inject('DatabasePool') private pool: Pool,
  ) {}

  private toDTO(t: any): TransactionDTO {
    return {
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      categoryId: t.category_id,
      accountId: t.account_id,
      date: typeof t.date === 'string' ? t.date : new Date(t.date).toISOString().split('T')[0],
      recurring: t.recurring,
      recurrence: t.recurrence,
      nextDueDate: t.next_due_date
        ? (typeof t.next_due_date === 'string' ? t.next_due_date : new Date(t.next_due_date).toISOString().split('T')[0])
        : null,
    };
  }

  async getAll(userId: string): Promise<TransactionDTO[]> {
    const txs = await this.txRepo.findAllByUser(userId);
    return txs.map(this.toDTO);
  }

  async create(userId: string, data: {
    accountId: string; categoryId: string; description: string;
    amount: number; type: string; date: string; recurring: boolean; recurrence?: string;
  }): Promise<TransactionDTO> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const nextDueDate = data.recurring && data.recurrence
        ? addRecurrence(data.date, data.recurrence)
        : null;

      const tx = await this.txRepo.create(userId, {
        account_id: data.accountId,
        category_id: data.categoryId,
        description: data.description,
        amount: data.amount,
        type: data.type,
        date: data.date,
        recurring: data.recurring,
        recurrence: data.recurrence ?? null,
        next_due_date: nextDueDate,
      }, client);

      // Atualiza saldo da conta
      const delta = data.type === 'income' ? data.amount : -data.amount;
      await this.accountRepo.updateBalance(data.accountId, delta, client);

      await client.query('COMMIT');
      return this.toDTO(tx);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async update(id: string, userId: string, data: Partial<{
    description: string; amount: number; type: string;
    categoryId: string; accountId: string; date: string;
    recurring: boolean; recurrence: string | null;
    nextDueDate: string | null;
  }>): Promise<TransactionDTO> {
    // Mapeia camelCase -> snake_case
    const mapped: any = {};
    if (data.description !== undefined) mapped.description = data.description;
    if (data.amount !== undefined) mapped.amount = data.amount;
    if (data.type !== undefined) mapped.type = data.type;
    if (data.categoryId !== undefined) mapped.category_id = data.categoryId;
    if (data.accountId !== undefined) mapped.account_id = data.accountId;
    if (data.date !== undefined) mapped.date = data.date;
    if (data.recurring !== undefined) mapped.recurring = data.recurring;
    if (data.recurrence !== undefined) mapped.recurrence = data.recurrence;
    if (data.nextDueDate !== undefined) mapped.next_due_date = data.nextDueDate;

    const tx = await this.txRepo.update(id, userId, mapped);
    if (!tx) throw { statusCode: 404, message: 'Transação não encontrada.' };
    return this.toDTO(tx);
  }

  async delete(id: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const tx = await this.txRepo.delete(id, userId);
      if (!tx) throw { statusCode: 404, message: 'Transação não encontrada.' };

      // Reverte saldo
      if (tx.account_id) {
        const delta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
        await this.accountRepo.updateBalance(tx.account_id, delta, client);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async transfer(userId: string, fromId: string, toId: string, amount: number, description?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      await this.accountRepo.updateBalance(fromId, -amount, client);
      await this.accountRepo.updateBalance(toId, amount, client);

      // Cria duas transações de registro
      const date = new Date().toISOString().split('T')[0];
      await this.txRepo.create(userId, {
        account_id: fromId,
        category_id: '',
        description: description || 'Transferência enviada',
        amount,
        type: 'expense',
        date,
        recurring: false,
      }, client);

      await this.txRepo.create(userId, {
        account_id: toId,
        category_id: '',
        description: description || 'Transferência recebida',
        amount,
        type: 'income',
        date,
        recurring: false,
      }, client);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Processa todas as transações recorrentes cujo next_due_date <= hoje.
   * Para cada uma, cria uma nova transação (igual) na data devida
   * e avança o next_due_date.
   */
  async processRecurrences(): Promise<{ processed: number }> {
    const today = new Date().toISOString().split('T')[0];
    const dueTxs = await this.txRepo.findDueRecurring(today);

    let processed = 0;
    for (const tx of dueTxs) {
      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        // Cria nova transação na data devida
        await this.txRepo.create(tx.user_id, {
          account_id: tx.account_id ?? '',
          category_id: tx.category_id ?? '',
          description: tx.description,
          amount: Number(tx.amount),
          type: tx.type,
          date: typeof tx.next_due_date === 'string'
            ? tx.next_due_date
            : new Date(tx.next_due_date!).toISOString().split('T')[0],
          recurring: false,
          recurrence: null,
          next_due_date: null,
        }, client);

        // Atualiza saldo da conta
        if (tx.account_id) {
          const delta = tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount);
          await this.accountRepo.updateBalance(tx.account_id, delta, client);
        }

        // Avança o next_due_date da transação recorrente original
        const currentDue = typeof tx.next_due_date === 'string'
          ? tx.next_due_date
          : new Date(tx.next_due_date!).toISOString().split('T')[0];
        const nextDue = addRecurrence(currentDue, tx.recurrence!);
        await this.txRepo.updateNextDueDate(tx.id, nextDue, client);

        await client.query('COMMIT');
        processed++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erro ao processar recorrência da transação ${tx.id}:`, err);
      } finally {
        client.release();
      }
    }

    return { processed };
  }
}
