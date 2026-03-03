import { injectable, inject } from 'tsyringe';
import { Pool } from 'pg';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { CreditCardRepository } from '../repositories/CreditCardRepository';
import { CreditCardService } from './CreditCardService';
import type { Transaction, TransactionDTO } from '../entities';

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
    @inject('CreditCardRepository') private cardRepo: CreditCardRepository,
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
      creditCardId: t.credit_card_id ?? null,
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
      installments: t.installments != null ? Number(t.installments) : null,
      installmentCurrent: t.installment_current != null ? Number(t.installment_current) : null,
      familyMemberId: t.family_member_id ?? null,
    };
  }

  async getAll(userId: string): Promise<TransactionDTO[]> {
    const txs = await this.txRepo.findAllByUser(userId);
    return txs.map(this.toDTO);
  }

  async create(userId: string, data: {
    accountId?: string | null; categoryId: string; description: string;
    amount: number; type: string; date: string; recurring: boolean; recurrence?: string;
    recurrenceCount?: number | null;
    creditCardId?: string | null;
    installments?: number | null;
    familyMemberId?: string | null;
  }): Promise<TransactionDTO> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const nextDueDate = data.recurring && data.recurrence
        ? addRecurrence(data.date, data.recurrence)
        : null;

      const useCreditCard = !!data.creditCardId && data.type === 'expense';

      const tx = await this.txRepo.create(userId, {
        account_id: useCreditCard ? null : (data.accountId || null),
        category_id: data.categoryId,
        credit_card_id: useCreditCard ? data.creditCardId! : null,
        description: data.description,
        amount: data.amount,
        type: data.type,
        date: data.date,
        recurring: data.recurring,
        recurrence: data.recurrence ?? null,
        next_due_date: nextDueDate,
        recurrence_count: data.recurrenceCount ?? null,
        recurrence_current: data.recurring ? 1 : 0,
        recurrence_group_id: null,
        installments: useCreditCard ? (data.installments ?? null) : null,
        installment_current: useCreditCard && data.installments ? 1 : null,
        family_member_id: data.familyMemberId ?? null,
      }, client);

      if (useCreditCard) {
        const card = await this.cardRepo.findById(data.creditCardId!, userId);
        if (!card) throw { statusCode: 404, message: 'Cartão não encontrado.' };

        if (data.installments && data.installments > 1) {
          const installmentAmount = Math.round((data.amount / data.installments) * 100) / 100;
          for (let i = 0; i < data.installments; i++) {
            const installDate = new Date(data.date + 'T00:00:00Z');
            installDate.setUTCMonth(installDate.getUTCMonth() + i);
            const dateStr = installDate.toISOString().split('T')[0];
            const invoiceMonth = CreditCardService.getInvoiceMonth(dateStr, card.closing_day);
            await this.cardRepo.upsertInvoice(data.creditCardId!, userId, invoiceMonth, installmentAmount);
          }
        } else {
          const invoiceMonth = CreditCardService.getInvoiceMonth(data.date, card.closing_day);
          await this.cardRepo.upsertInvoice(data.creditCardId!, userId, invoiceMonth, data.amount);
        }
      } else if (data.accountId) {
        const delta = data.type === 'income' ? data.amount : -data.amount;
        await this.accountRepo.updateBalance(data.accountId, delta, client);
      }

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
    nextDueDate: string | null; creditCardId: string | null;
    installments: number | null; installmentCurrent: number | null;
    familyMemberId: string | null;
  }>): Promise<TransactionDTO> {
    const current = await this.txRepo.findById(id, userId);
    if (!current) throw { statusCode: 404, message: 'Transação não encontrada.' };

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
    if (data.creditCardId !== undefined) mapped.credit_card_id = data.creditCardId;
    if (data.installments !== undefined) mapped.installments = data.installments;
    if (data.installmentCurrent !== undefined) mapped.installment_current = data.installmentCurrent;
    if (data.familyMemberId !== undefined) mapped.family_member_id = data.familyMemberId;

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      if (current.account_id) {
        const oldDelta = current.type === 'income' ? -Number(current.amount) : Number(current.amount);
        await this.accountRepo.updateBalance(current.account_id, oldDelta, client);
      }

      const newAccountId = data.accountId !== undefined ? data.accountId : current.account_id;
      const newType = data.type ?? current.type;
      const newAmount = data.amount ?? Number(current.amount);
      const newCreditCardId = data.creditCardId !== undefined ? data.creditCardId : current.credit_card_id;

      if (newAccountId && !newCreditCardId) {
        const newDelta = newType === 'income' ? newAmount : -newAmount;
        await this.accountRepo.updateBalance(newAccountId, newDelta, client);
      }

      if (newCreditCardId && newAccountId) {
        mapped.account_id = null;
      }

      const tx = await this.txRepo.update(id, userId, mapped, client);
      if (!tx) throw { statusCode: 404, message: 'Transação não encontrada.' };

      await client.query('COMMIT');
      return this.toDTO(tx);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  private async reverseInvoice(tx: Transaction, client: any): Promise<void> {
    if (!tx.credit_card_id) return;

    const card = await this.cardRepo.findById(tx.credit_card_id, tx.user_id);
    if (!card) return;

    const installments = tx.installments ? Number(tx.installments) : 1;
    const perInstallment = Number(tx.amount) / installments;
    const dateStr = typeof tx.date === 'string'
      ? tx.date.split('T')[0]
      : new Date(tx.date).toISOString().split('T')[0];

    for (let i = 0; i < installments; i++) {
      const d = new Date(dateStr + 'T00:00:00Z');
      d.setUTCMonth(d.getUTCMonth() + i);
      const offsetDate = d.toISOString().split('T')[0];
      const refMonth = CreditCardService.getInvoiceMonth(offsetDate, card.closing_day);
      await this.cardRepo.subtractFromInvoice(tx.credit_card_id, refMonth, perInstallment, client);
    }
  }

  async delete(id: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const tx = await this.txRepo.delete(id, userId);
      if (!tx) throw { statusCode: 404, message: 'Transação não encontrada.' };

      if (tx.account_id) {
        const delta = tx.type === 'income' ? -Number(tx.amount) : Number(tx.amount);
        await this.accountRepo.updateBalance(tx.account_id, delta, client);
      }

      if (tx.credit_card_id) {
        await this.reverseInvoice(tx, client);
      }

      await client.query('COMMIT');
    } catch (err) {
      console.log(err)
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

  async processRecurrences(): Promise<{ processed: number }> {
    const today = new Date().toISOString().split('T')[0];
    const dueTxs = await this.txRepo.findDueRecurring(today);

    const expo = new Expo();
    const notifications: ExpoPushMessage[] = [];
    let processed = 0;

    for (const tx of dueTxs) {
      if (tx.recurrence_paused) continue;

      const client = await this.pool.connect();
      try {
        await client.query('BEGIN');

        const newCurrent = (Number(tx.recurrence_current) || 0) + 1;
        const dueDate = typeof tx.next_due_date === 'string'
          ? tx.next_due_date
          : new Date(tx.next_due_date!).toISOString().split('T')[0];

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
          recurrence_group_id: tx.id,
        }, client);

        if (tx.account_id) {
          const delta = tx.type === 'income' ? Number(tx.amount) : -Number(tx.amount);
          await this.accountRepo.updateBalance(tx.account_id, delta, client);
        }

        const count = tx.recurrence_count != null ? Number(tx.recurrence_count) : null;
        if (count !== null && newCurrent >= count) {
          await client.query(
            'UPDATE transactions SET recurring = false, next_due_date = NULL, recurrence_current = $1 WHERE id = $2',
            [newCurrent, tx.id]
          );
        } else {
          const nextDue = addRecurrence(dueDate, tx.recurrence!);
          await client.query(
            'UPDATE transactions SET next_due_date = $1, recurrence_current = $2 WHERE id = $3',
            [nextDue, newCurrent, tx.id]
          );
        }

        await client.query('COMMIT');
        processed++;

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

  async getRecurrenceChildren(parentId: string, userId: string): Promise<TransactionDTO[]> {
    const rows = await this.txRepo.findByGroupId(parentId, userId);
    return rows.map(this.toDTO);
  }

  async toggleRecurrencePause(id: string, userId: string, paused: boolean): Promise<TransactionDTO> {
    const tx = await this.txRepo.update(id, userId, { recurrence_paused: paused });
    if (!tx) throw { statusCode: 404, message: 'Transação não encontrada.' };
    return this.toDTO(tx);
  }

  async deleteRecurrenceWithHistory(id: string, userId: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: children } = await client.query(
        'DELETE FROM transactions WHERE recurrence_group_id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
      for (const child of children) {
        if (child.account_id) {
          const delta = child.type === 'income' ? -Number(child.amount) : Number(child.amount);
          await this.accountRepo.updateBalance(child.account_id, delta, client);
        }
        if (child.credit_card_id) {
          await this.reverseInvoice(child, client);
        }
      }

      const { rows: parentRows } = await client.query(
        'DELETE FROM transactions WHERE id = $1 AND user_id = $2 RETURNING *',
        [id, userId]
      );
      const p = parentRows[0];
      if (p) {
        if (p.account_id) {
          const delta = p.type === 'income' ? -Number(p.amount) : Number(p.amount);
          await this.accountRepo.updateBalance(p.account_id, delta, client);
        }
        if (p.credit_card_id) {
          await this.reverseInvoice(p, client);
        }
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
