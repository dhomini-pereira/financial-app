import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { Pool } from 'pg';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function familyMemberRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const pool = container.resolve<Pool>('DatabasePool');

  app.get('/family-members', async (request, reply) => {
    const { rows } = await pool.query(
      'SELECT * FROM family_members WHERE user_id = $1 ORDER BY name ASC',
      [request.userId]
    );
    return reply.send(rows.map((r: any) => ({ id: r.id, name: r.name })));
  });

  app.post('/family-members', async (request, reply) => {
    const { name } = request.body as any;
    if (!name) return reply.status(400).send({ message: 'Nome é obrigatório.' });
    const { rows } = await pool.query(
      'INSERT INTO family_members (user_id, name) VALUES ($1, $2) RETURNING *',
      [request.userId, name]
    );
    return reply.status(201).send({ id: rows[0].id, name: rows[0].name });
  });

  app.put('/family-members/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { name } = request.body as any;
    if (!name) return reply.status(400).send({ message: 'Nome é obrigatório.' });
    const { rows } = await pool.query(
      'UPDATE family_members SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
      [name, id, request.userId]
    );
    if (!rows[0]) return reply.status(404).send({ message: 'Membro não encontrado.' });
    return reply.send({ id: rows[0].id, name: rows[0].name });
  });

  app.delete('/family-members/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { rowCount } = await pool.query(
      'DELETE FROM family_members WHERE id = $1 AND user_id = $2',
      [id, request.userId]
    );
    if (!rowCount) return reply.status(404).send({ message: 'Membro não encontrado.' });
    return reply.status(204).send();
  });
}
