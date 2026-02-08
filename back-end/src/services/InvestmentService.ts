import { injectable, inject } from 'tsyringe';
import { InvestmentRepository } from '../repositories/InvestmentRepository';
import type { InvestmentDTO } from '../entities';

@injectable()
export class InvestmentService {
  constructor(@inject('InvestmentRepository') private repo: InvestmentRepository) {}

  private toDTO(i: any): InvestmentDTO {
    return {
      id: i.id,
      name: i.name,
      type: i.type,
      principal: Number(i.principal),
      currentValue: Number(i.current_value),
      returnRate: Number(i.return_rate),
      startDate: typeof i.start_date === 'string' ? i.start_date : new Date(i.start_date).toISOString().split('T')[0],
    };
  }

  async getAll(userId: string): Promise<InvestmentDTO[]> {
    const investments = await this.repo.findAllByUser(userId);
    return investments.map(this.toDTO);
  }

  async create(userId: string, data: {
    name: string; type: string; principal: number;
    currentValue: number; returnRate: number; startDate: string;
  }): Promise<InvestmentDTO> {
    const inv = await this.repo.create(userId, {
      name: data.name,
      type: data.type,
      principal: data.principal,
      current_value: data.currentValue,
      return_rate: data.returnRate,
      start_date: data.startDate,
    });
    return this.toDTO(inv);
  }

  async update(id: string, userId: string, data: Partial<{
    name: string; type: string; principal: number;
    currentValue: number; returnRate: number; startDate: string;
  }>): Promise<InvestmentDTO> {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.type !== undefined) mapped.type = data.type;
    if (data.principal !== undefined) mapped.principal = data.principal;
    if (data.currentValue !== undefined) mapped.current_value = data.currentValue;
    if (data.returnRate !== undefined) mapped.return_rate = data.returnRate;
    if (data.startDate !== undefined) mapped.start_date = data.startDate;

    const inv = await this.repo.update(id, userId, mapped);
    if (!inv) throw { statusCode: 404, message: 'Investimento não encontrado.' };
    return this.toDTO(inv);
  }

  async delete(id: string, userId: string): Promise<void> {
    const ok = await this.repo.delete(id, userId);
    if (!ok) throw { statusCode: 404, message: 'Investimento não encontrado.' };
  }
}
