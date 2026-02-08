import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { TransactionService } from '../services/TransactionService';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function transactionRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const service = container.resolve<TransactionService>('TransactionService');

  app.get('/transactions', async (request, reply) => {
    const txs = await service.getAll(request.userId);
    return reply.send(txs);
  });

  app.post('/transactions', async (request, reply) => {
    const data = request.body as any;
    try {
      const tx = await service.create(request.userId, data);
      return reply.status(201).send(tx);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.put('/transactions/:id', async (request, reply) => {
    const { id } = request.params as any;
    const data = request.body as any;
    try {
      const tx = await service.update(id, request.userId, data);
      return reply.send(tx);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.delete('/transactions/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await service.delete(id, request.userId);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.post('/transfers', async (request, reply) => {
    const { fromAccountId, toAccountId, amount, description } = request.body as any;
    if (!fromAccountId || !toAccountId || !amount) {
      return reply.status(400).send({ message: 'fromAccountId, toAccountId e amount são obrigatórios.' });
    }
    try {
      await service.transfer(request.userId, fromAccountId, toAccountId, amount, description);
      return reply.status(201).send({ message: 'Transferência realizada com sucesso.' });
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });
}
