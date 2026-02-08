import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { GoalService } from '../services/GoalService';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function goalRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const service = container.resolve<GoalService>('GoalService');

  app.get('/goals', async (request, reply) => {
    const goals = await service.getAll(request.userId);
    return reply.send(goals);
  });

  app.post('/goals', async (request, reply) => {
    const data = request.body as any;
    try {
      const goal = await service.create(request.userId, data);
      return reply.status(201).send(goal);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.put('/goals/:id', async (request, reply) => {
    const { id } = request.params as any;
    const data = request.body as any;
    try {
      const goal = await service.update(id, request.userId, data);
      return reply.send(goal);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.delete('/goals/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await service.delete(id, request.userId);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });
}
