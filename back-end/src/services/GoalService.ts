import { injectable, inject } from 'tsyringe';
import { GoalRepository } from '../repositories/GoalRepository';
import type { GoalDTO } from '../entities';

@injectable()
export class GoalService {
  constructor(@inject('GoalRepository') private repo: GoalRepository) {}

  private toDTO(g: any): GoalDTO {
    return {
      id: g.id,
      name: g.name,
      targetAmount: Number(g.target_amount),
      currentAmount: Number(g.current_amount),
      deadline: g.deadline ? (typeof g.deadline === 'string' ? g.deadline : new Date(g.deadline).toISOString().split('T')[0]) : null,
      icon: g.icon,
    };
  }

  async getAll(userId: string): Promise<GoalDTO[]> {
    const goals = await this.repo.findAllByUser(userId);
    return goals.map(this.toDTO);
  }

  async create(userId: string, data: {
    name: string; targetAmount: number; currentAmount: number;
    deadline: string | null; icon: string;
  }): Promise<GoalDTO> {
    const goal = await this.repo.create(userId, {
      name: data.name,
      target_amount: data.targetAmount,
      current_amount: data.currentAmount,
      deadline: data.deadline,
      icon: data.icon,
    });
    return this.toDTO(goal);
  }

  async update(id: string, userId: string, data: Partial<{
    name: string; targetAmount: number; currentAmount: number;
    deadline: string | null; icon: string;
  }>): Promise<GoalDTO> {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.targetAmount !== undefined) mapped.target_amount = data.targetAmount;
    if (data.currentAmount !== undefined) mapped.current_amount = data.currentAmount;
    if (data.deadline !== undefined) mapped.deadline = data.deadline;
    if (data.icon !== undefined) mapped.icon = data.icon;

    const goal = await this.repo.update(id, userId, mapped);
    if (!goal) throw { statusCode: 404, message: 'Meta não encontrada.' };
    return this.toDTO(goal);
  }

  async delete(id: string, userId: string): Promise<void> {
    const ok = await this.repo.delete(id, userId);
    if (!ok) throw { statusCode: 404, message: 'Meta não encontrada.' };
  }
}
