import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { TransactionService } from '../services/TransactionService';
import { env } from '../config/env';

export async function cronRoutes(app: FastifyInstance) {
  const service = container.resolve<TransactionService>('TransactionService');

  /**
   * Endpoint chamado pelo Vercel Cron diariamente.
   * Processa transações recorrentes cujo next_due_date <= hoje.
   */
  app.get('/api/cron/recurrences', async (request, reply) => {
    // Verifica CRON_SECRET para garantir que só o Vercel Cron pode chamar
    const authHeader = request.headers['authorization'];
    const cronSecret = env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return reply.status(401).send({ message: 'Unauthorized' });
    }

    try {
      const result = await service.processRecurrences();
      return reply.send({
        ok: true,
        processed: result.processed,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Erro no cron de recorrências:', err);
      return reply.status(500).send({ message: err.message });
    }
  });
}
