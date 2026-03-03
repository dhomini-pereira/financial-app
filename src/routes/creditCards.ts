import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { CreditCardService } from '../services/CreditCardService';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function creditCardRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const service = container.resolve<CreditCardService>('CreditCardService');

  app.get('/credit-cards', async (request, reply) => {
    const cards = await service.getAll(request.userId);
    return reply.send(cards);
  });

  app.post('/credit-cards', async (request, reply) => {
    const data = request.body as any;
    try {
      const card = await service.create(request.userId, data);
      return reply.status(201).send(card);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.put('/credit-cards/:id', async (request, reply) => {
    const { id } = request.params as any;
    const data = request.body as any;
    try {
      const card = await service.update(id, request.userId, data);
      return reply.send(card);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.delete('/credit-cards/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      await service.delete(id, request.userId);
      return reply.status(204).send();
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.get('/credit-cards/:id/invoices', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const invoices = await service.getInvoices(id, request.userId);
      return reply.send(invoices);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.post('/credit-cards/invoices/:invoiceId/pay', async (request, reply) => {
    const { invoiceId } = request.params as any;
    const { accountId } = request.body as any;
    if (!accountId) {
      return reply.status(400).send({ message: 'accountId é obrigatório.' });
    }
    try {
      const invoice = await service.payInvoice(invoiceId, request.userId, accountId);
      return reply.send(invoice);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.post('/credit-cards/invoices/:invoiceId/unpay', async (request, reply) => {
    const { invoiceId } = request.params as any;
    try {
      const invoice = await service.unpayInvoice(invoiceId, request.userId);
      return reply.send(invoice);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });
}
