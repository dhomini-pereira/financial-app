import { injectable, inject } from 'tsyringe';
import { AccountRepository } from '../repositories/AccountRepository';
import type { AccountDTO } from '../entities';

@injectable()
export class AccountService {
  constructor(@inject('AccountRepository') private repo: AccountRepository) {}

  private toDTO(a: any): AccountDTO {
    return {
      id: a.id,
      name: a.name,
      type: a.type,
      balance: Number(a.balance),
      color: a.color,
    };
  }

  async getAll(userId: string): Promise<AccountDTO[]> {
    const accounts = await this.repo.findAllByUser(userId);
    return accounts.map(this.toDTO);
  }

  async create(userId: string, data: { name: string; type: string; balance: number; color: string }): Promise<AccountDTO> {
    const account = await this.repo.create(userId, data);
    return this.toDTO(account);
  }

  async update(id: string, userId: string, data: Partial<{ name: string; type: string; balance: number; color: string }>): Promise<AccountDTO> {
    const account = await this.repo.update(id, userId, data);
    if (!account) throw { statusCode: 404, message: 'Conta não encontrada.' };
    return this.toDTO(account);
  }

  async delete(id: string, userId: string): Promise<void> {
    const ok = await this.repo.delete(id, userId);
    if (!ok) throw { statusCode: 404, message: 'Conta não encontrada.' };
  }
}
