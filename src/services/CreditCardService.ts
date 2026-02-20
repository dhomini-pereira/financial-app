import { injectable, inject } from "tsyringe";
import { Pool } from "pg";
import { CreditCardRepository } from "../repositories/CreditCardRepository";
import { AccountRepository } from "../repositories/AccountRepository";
import type { CreditCardDTO, CreditCardInvoiceDTO } from "../entities";

@injectable()
export class CreditCardService {
  constructor(
    @inject("CreditCardRepository") private cardRepo: CreditCardRepository,
    @inject("AccountRepository") private accountRepo: AccountRepository,
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
        "SELECT * FROM credit_card_invoices WHERE id = $1 AND user_id = $2",
        [invoiceId, userId],
      );
      const invoice = rows[0];
      if (!invoice)
        throw { statusCode: 404, message: "Fatura não encontrada." };
      if (invoice.paid)
        throw { statusCode: 400, message: "Fatura já está paga." };

      const total = Number(invoice.total);

      await this.accountRepo.updateBalance(accountId, -total, client);

      const paid = await this.cardRepo.payInvoice(
        invoiceId,
        userId,
        accountId,
        client,
      );

      await client.query("COMMIT");
      return this.toInvoiceDTO(paid);
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
