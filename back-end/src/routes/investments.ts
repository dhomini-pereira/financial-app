import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { InvestmentService } from '../services/InvestmentService';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function investmentRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const service = container.resolve<InvestmentService>('InvestmentService');

  app.get('/investments', async (request, reply) => {
    const list = await service.getAll(request.userId);
    return reply.send(list);
  });

  app.post('/investments', async (request, reply) => {
    const data = request.body as any;
    try {
      const inv = await service.create(request.userId, data);
      return reply.status(201).send(inv);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.put('/investments/:id', async (request, reply) => {
    const { id } = request.params as any;
    const data = request.body as any;
    try {
      const inv = await service.update(id, request.userId, data);
      return reply.send(inv);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.delete('/investments/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await service.delete(id, request.userId);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });
}
