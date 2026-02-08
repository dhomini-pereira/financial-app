import { injectable, inject } from 'tsyringe';
import { CategoryRepository } from '../repositories/CategoryRepository';
import type { CategoryDTO } from '../entities';

@injectable()
export class CategoryService {
  constructor(@inject('CategoryRepository') private repo: CategoryRepository) {}

  private toDTO(c: any): CategoryDTO {
    return { id: c.id, name: c.name, icon: c.icon, type: c.type };
  }

  async getAll(userId: string): Promise<CategoryDTO[]> {
    const cats = await this.repo.findAllByUser(userId);
    return cats.map(this.toDTO);
  }

  async create(userId: string, data: { name: string; icon: string; type: string }): Promise<CategoryDTO> {
    const cat = await this.repo.create(userId, data);
    return this.toDTO(cat);
  }

  async update(id: string, userId: string, data: Partial<{ name: string; icon: string; type: string }>): Promise<CategoryDTO> {
    const cat = await this.repo.update(id, userId, data);
    if (!cat) throw { statusCode: 404, message: 'Categoria não encontrada.' };
    return this.toDTO(cat);
  }

  async delete(id: string, userId: string): Promise<void> {
    const ok = await this.repo.delete(id, userId);
    if (!ok) throw { statusCode: 404, message: 'Categoria não encontrada.' };
  }
}
