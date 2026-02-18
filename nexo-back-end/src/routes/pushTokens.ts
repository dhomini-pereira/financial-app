import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { Pool } from 'pg';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function pushTokenRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const pool = container.resolve<Pool>('DatabasePool');

  /** Registra ou atualiza o push token do dispositivo */
  app.post('/push-token', async (request, reply) => {
    const { token } = request.body as { token: string };
    if (!token) {
      return reply.status(400).send({ message: 'Token é obrigatório.' });
    }

    await pool.query(
      `INSERT INTO push_tokens (user_id, token) VALUES ($1, $2)
       ON CONFLICT (user_id, token) DO NOTHING`,
      [request.userId, token],
    );

    return reply.send({ ok: true });
  });

  /** Remove um push token (logout / desativar notificações) */
  app.delete('/push-token', async (request, reply) => {
    const { token } = request.body as { token: string };
    if (!token) {
      return reply.status(400).send({ message: 'Token é obrigatório.' });
    }

    await pool.query(
      'DELETE FROM push_tokens WHERE user_id = $1 AND token = $2',
      [request.userId, token],
    );

    return reply.status(204).send();
  });
}
