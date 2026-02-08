import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { CategoryService } from '../services/CategoryService';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function categoryRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const service = container.resolve<CategoryService>('CategoryService');

  app.get('/categories', async (request, reply) => {
    const cats = await service.getAll(request.userId);
    return reply.send(cats);
  });

  app.post('/categories', async (request, reply) => {
    const { name, icon, type } = request.body as any;
    try {
      const cat = await service.create(request.userId, { name, icon: icon ?? '📋', type });
      return reply.status(201).send(cat);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.put('/categories/:id', async (request, reply) => {
    const { id } = request.params as any;
    const data = request.body as any;
    try {
      const cat = await service.update(id, request.userId, data);
      return reply.send(cat);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.delete('/categories/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await service.delete(id, request.userId);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });
}
