import { injectable, inject } from "tsyringe";
import { Pool } from "pg";
import { CreditCardRepository } from "../repositories/CreditCardRepository";
import { AccountRepository } from "../repositories/AccountRepository";
import { TransactionRepository } from "../repositories/TransactionRepository";
import type { CreditCardDTO, CreditCardInvoiceDTO } from "../entities";

@injectable()
export class CreditCardService {
  constructor(
    @inject("CreditCardRepository") private cardRepo: CreditCardRepository,
    @inject("AccountRepository") private accountRepo: AccountRepository,
    @inject("TransactionRepository") private txRepo: TransactionRepository,
    @inject("DatabasePool") private pool: Pool,
  ) {}

  private toDTO(c: any, usedAmount = 0): CreditCardDTO {
    const limit = Number(c.card_limit);
    return {
      id: c.id,
      name: c.name,
      limit,
      closingDay: c.closing_day,
      dueDay: c.due_day,
      bestPurchaseDay:
        c.best_purchase_day ?? (c.closing_day >= 31 ? 1 : c.closing_day + 1),
      color: c.color,
      usedAmount,
      availableLimit: limit - usedAmount,
    };
  }

  private toInvoiceDTO(inv: any): CreditCardInvoiceDTO {
    return {
      id: inv.id,
      creditCardId: inv.credit_card_id,
      referenceMonth: inv.reference_month,
      total: Number(inv.total),
      paid: inv.paid,
      paidAt: inv.paid_at ? new Date(inv.paid_at).toISOString() : null,
      paidWithAccountId: inv.paid_with_account_id,
      paidAmount: Number(inv.paid_amount ?? 0),
    };
  }

  async getAll(userId: string): Promise<CreditCardDTO[]> {
    const cards = await this.cardRepo.findAllByUser(userId);
    const result: CreditCardDTO[] = [];
    for (const card of cards) {
      const used = await this.cardRepo.getUsedAmount(card.id);
      result.push(this.toDTO(card, used));
    }
    return result;
  }

  async create(
    userId: string,
    data: {
      name: string;
      limit: number;
      closingDay: number;
      dueDay: number;
      bestPurchaseDay?: number | null;
      color: string;
    },
  ): Promise<CreditCardDTO> {
    const card = await this.cardRepo.create(userId, {
      name: data.name,
      card_limit: data.limit,
      closing_day: data.closingDay,
      due_day: data.dueDay,
      best_purchase_day: data.bestPurchaseDay ?? null,
      color: data.color,
    });
    return this.toDTO(card, 0);
  }

  async update(
    id: string,
    userId: string,
    data: Partial<{
      name: string;
      limit: number;
      closingDay: number;
      dueDay: number;
      bestPurchaseDay: number | null;
      color: string;
    }>,
  ): Promise<CreditCardDTO> {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.limit !== undefined) mapped.card_limit = data.limit;
    if (data.closingDay !== undefined) mapped.closing_day = data.closingDay;
    if (data.dueDay !== undefined) mapped.due_day = data.dueDay;
    if (data.bestPurchaseDay !== undefined)
      mapped.best_purchase_day = data.bestPurchaseDay;
    if (data.color !== undefined) mapped.color = data.color;

    const card = await this.cardRepo.update(id, userId, mapped);
    if (!card) throw { statusCode: 404, message: "Cartão não encontrado." };
    const used = await this.cardRepo.getUsedAmount(id);
    return this.toDTO(card, used);
  }

  async delete(id: string, userId: string): Promise<void> {
    const card = await this.cardRepo.delete(id, userId);
    if (!card) throw { statusCode: 404, message: "Cartão não encontrado." };
  }

  async getInvoices(
    cardId: string,
    userId: string,
  ): Promise<CreditCardInvoiceDTO[]> {
    const invoices = await this.cardRepo.findInvoicesByCard(cardId, userId);
    return invoices.map(this.toInvoiceDTO);
  }

  async payInvoice(
    invoiceId: string,
    userId: string,
    accountId: string,
  ): Promise<CreditCardInvoiceDTO> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT i.*, cc.name AS card_name FROM credit_card_invoices i JOIN credit_cards cc ON cc.id = i.credit_card_id WHERE i.id = $1 AND i.user_id = $2",
        [invoiceId, userId],
      );
      const invoice = rows[0];
      if (!invoice)
        throw { statusCode: 404, message: "Fatura não encontrada." };

      const total = Number(invoice.total);

      // If already paid (re-payment), revert old payment first
      if (invoice.paid && invoice.paid_with_account_id) {
        const oldPaidAmount = Number(invoice.paid_amount ?? total);
        // Credit old account back
        await this.accountRepo.updateBalance(invoice.paid_with_account_id, oldPaidAmount, client);
        // Delete old payment transaction
        await client.query(
          "DELETE FROM transactions WHERE user_id = $1 AND credit_card_id = $2 AND description LIKE $3 AND type = 'expense' AND account_id = $4",
          [userId, invoice.credit_card_id, `Fatura %${invoice.reference_month}%`, invoice.paid_with_account_id],
        );
      }

      // Debit new account
      await this.accountRepo.updateBalance(accountId, -total, client);

      // Store paid_amount = current total at time of payment
      const paid = await this.cardRepo.payInvoice(
        invoiceId,
        userId,
        accountId,
        total,
        client,
      );

      // Create super-transaction (visible in main dashboard)
      const cardName = invoice.card_name ?? 'Cartão';
      const txDate = new Date().toISOString().slice(0, 10);
      await this.txRepo.create(userId, {
        account_id: accountId,
        category_id: null,
        credit_card_id: invoice.credit_card_id,
        description: `Fatura ${cardName} (${invoice.reference_month})`,
        amount: total,
        type: 'expense',
        date: txDate,
        recurring: false,
        recurrence: null,
        next_due_date: null,
        recurrence_count: null,
        recurrence_current: 0,
        recurrence_group_id: null,
        installments: null,
        installment_current: null,
        family_member_id: null,
      }, client);

      await client.query("COMMIT");
      return this.toInvoiceDTO(paid);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async unpayInvoice(
    invoiceId: string,
    userId: string,
  ): Promise<CreditCardInvoiceDTO> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query(
        "SELECT * FROM credit_card_invoices WHERE id = $1 AND user_id = $2",
        [invoiceId, userId],
      );
      const invoice = rows[0];
      if (!invoice)
        throw { statusCode: 404, message: "Fatura não encontrada." };
      if (!invoice.paid)
        throw { statusCode: 400, message: "Fatura não está paga." };

      // Credit back the PAID amount (not current total, which may have changed)
      const paidAmount = Number(invoice.paid_amount ?? invoice.total);
      if (invoice.paid_with_account_id) {
        await this.accountRepo.updateBalance(invoice.paid_with_account_id, paidAmount, client);
      }

      // Delete the payment super-transaction
      await client.query(
        "DELETE FROM transactions WHERE user_id = $1 AND credit_card_id = $2 AND description LIKE $3 AND type = 'expense' AND account_id = $4",
        [userId, invoice.credit_card_id, `Fatura %${invoice.reference_month}%`, invoice.paid_with_account_id],
      );

      // Reset invoice to unpaid
      const unpaid = await this.cardRepo.unpayInvoice(invoiceId, userId, client);

      await client.query("COMMIT");
      return this.toInvoiceDTO(unpaid);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  static getInvoiceMonth(transactionDate: string, closingDay: number): string {
    const d = new Date(transactionDate + "T00:00:00Z");
    const day = d.getUTCDate();
    let month = d.getUTCMonth();
    let year = d.getUTCFullYear();

    if (day > closingDay) {
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }

    return `${year}-${String(month + 1).padStart(2, "0")}`;
  }
}
