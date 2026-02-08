import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import type { TransactionDTO } from '../entities';

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

      const tx = await this.txRepo.create(userId, {
        account_id: data.accountId,
        category_id: data.categoryId,
        description: data.description,
        amount: data.amount,
        type: data.type,
        date: data.date,
        recurring: data.recurring,
        recurrence: data.recurrence ?? null,
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
}
