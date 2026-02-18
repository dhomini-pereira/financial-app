import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
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
      recurrenceCount: t.recurrence_count != null ? Number(t.recurrence_count) : null,
      recurrenceCurrent: Number(t.recurrence_current ?? 0),
      recurrenceGroupId: t.recurrence_group_id ?? null,
      recurrencePaused: t.recurrence_paused ?? false,
    };
  }

  async getAll(userId: string): Promise<TransactionDTO[]> {
    const txs = await this.txRepo.findAllByUser(userId);
    return txs.map(this.toDTO);
  }

  async create(userId: string, data: {
    accountId: string; categoryId: string; description: string;
    amount: number; type: string; date: string; recurring: boolean; recurrence?: string;
    recurrenceCount?: number | null;
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
        recurrence_count: data.recurrenceCount ?? null,
        recurrence_current: data.recurring ? 1 : 0,
        recurrence_group_id: null, // parent não tem group_id, ele É o grupo
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
        category_id: null,
        description: description || 'Transferência enviada',
        amount,
        type: 'expense',
        date,
        recurring: false,
      }, client);

      await this.txRepo.create(userId, {
        account_id: toId,
        category_id: null,
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
   * e avança o next_due_date. Se atingiu o total de parcelas, desativa.
   * Envia push notifications para os dispositivos do usuário.
   */
  async processRecurrences(): Promise<{ processed: number }> {
    const today = new Date().toISOString().split('T')[0];
    const dueTxs = await this.txRepo.findDueRecurring(today);

    const expo = new Expo();
    const notifications: ExpoPushMessage[] = [];
    let processed = 0;

    for (const tx of dueTxs) {
      // Pula recorrências pausadas
      if (tx.recurrence_paused) continue;

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const newCurrent = (Number(tx.recurrence_current) || 0) + 1;
        const dueDate = typeof tx.next_due_date === 'string'
          ? tx.next_due_date
          : new Date(tx.next_due_date!).toISOString().split('T')[0];

        // Cria nova transação na data devida, linkando ao pai
        await this.txRepo.create(tx.user_id, {
          account_id: tx.account_id ?? '',
          category_id: tx.category_id ?? '',
          description: tx.description,
          amount: Number(tx.amount),
          type: tx.type,
          date: dueDate,
          recurring: false,
          recurrence: null,
          next_due_date: null,
          recurrence_group_id: tx.id, // link para o pai
        }, client);

        // Atualiza saldo da conta
        if (tx.account_id) {
          const delta = tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount);
          await this.accountRepo.updateBalance(tx.account_id, delta, client);
        }

        // Verifica se atingiu o total de parcelas
        const count = tx.recurrence_count != null ? Number(tx.recurrence_count) : null;
        if (count !== null && newCurrent >= count) {
          // Finalizou todas as parcelas – desativa recorrência
          await client.query(
            'UPDATE transactions SET recurring = false, next_due_date = NULL, recurrence_current = $1 WHERE id = $2',
            [newCurrent, tx.id]
          );
        } else {
          // Avança o next_due_date e incrementa current
          const nextDue = addRecurrence(dueDate, tx.recurrence!);
          await client.query(
            'UPDATE transactions SET next_due_date = $1, recurrence_current = $2 WHERE id = $3',
            [nextDue, newCurrent, tx.id]
          );
        }

        await client.query('COMMIT');
        processed++;

        // Coleta push tokens do usuário para notificação
        const { rows: tokenRows } = await this.pool.query(
          'SELECT token FROM push_tokens WHERE user_id = $1', [tx.user_id]
        );

        const typeLabel = tx.type === 'income' ? 'Receita' : 'Despesa';
        const amountFmt = Number(tx.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const parcelaInfo = count ? ` (${newCurrent}/${count})` : '';

        for (const row of tokenRows) {
          if (Expo.isExpoPushToken(row.token)) {
            notifications.push({
              to: row.token,
              sound: 'default',
              title: `${typeLabel} recorrente processada`,
              body: `${tx.description}: ${amountFmt}${parcelaInfo}`,
              data: { transactionId: tx.id },
            });
          }
        }
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Erro ao processar recorrência da transação ${tx.id}:`, err);
      } finally {
        client.release();
      }
    }

    // Envia notificações em batch
    if (notifications.length > 0) {
      try {
        const chunks = expo.chunkPushNotifications(notifications);
        for (const chunk of chunks) {
          await expo.sendPushNotificationsAsync(chunk);
        }
      } catch (err) {
        console.error('Erro ao enviar notificações push:', err);
      }
    }

    return { processed };
  }

  /** Busca transações filhas geradas por uma recorrência */
  async getRecurrenceChildren(parentId: string, userId: string): Promise<TransactionDTO[]> {
    const rows = await this.txRepo.findByGroupId(parentId, userId);
    return rows.map(this.toDTO);
  }

  /** Pausa/despausa uma recorrência */
  async toggleRecurrencePause(id: string, userId: string, paused: boolean): Promise<TransactionDTO> {
    const tx = await this.txRepo.update(id, userId, { recurrence_paused: paused });
    if (!tx) throw { statusCode: 404, message: 'Transação não encontrada.' };
    return this.toDTO(tx);
  }

  /** Exclui uma recorrência e todo o histórico de transações filhas */
  async deleteRecurrenceWithHistory(id: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Exclui filhas e reverte saldos
      const { rows: children } = await client.query(
        'DELETE FROM transactions WHERE recurrence_group_id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
      for (const child of children) {
        if (child.account_id) {
          const delta = child.type === 'income' ? -Number(child.amount) : Number(child.amount);
          await this.accountRepo.updateBalance(child.account_id, delta, client);
        }
      }

      // Exclui a transação pai e reverte saldo da primeira parcela
      const { rows: parentRows } = await client.query(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
      if (parentRows[0]?.account_id) {
        const p = parentRows[0];
        const delta = p.type === 'income' ? -Number(p.amount) : Number(p.amount);
        await this.accountRepo.updateBalance(p.account_id, delta, client);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
