import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { AccountService } from '../services/AccountService';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function accountRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const service = container.resolve<AccountService>('AccountService');

  app.get('/accounts', async (request, reply) => {
    const accounts = await service.getAll(request.userId);
    return reply.send(accounts);
  });

  app.post('/accounts', async (request, reply) => {
    const { name, type, balance, color } = request.body as any;
    try {
      const account = await service.create(request.userId, { name, type, balance: balance ?? 0, color: color ?? '#2563eb' });
      return reply.status(201).send(account);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.put('/accounts/:id', async (request, reply) => {
    const { id } = request.params as any;
    const data = request.body as any;
    try {
      const account = await service.update(id, request.userId, data);
      return reply.send(account);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.delete('/accounts/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await service.delete(id, request.userId);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });
}
