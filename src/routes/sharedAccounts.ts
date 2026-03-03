import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { Pool } from 'pg';
import { SharedAccountRepository } from '../repositories/SharedAccountRepository';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { SharedAccountDTO } from '../entities';

export async function sharedAccountRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const pool = container.resolve<Pool>('DatabasePool');
  const repo = container.resolve<SharedAccountRepository>('SharedAccountRepository');

  // Share an account with a user (by email)
  app.post('/shared-accounts', async (request, reply) => {
    const { email, accountId } = request.body as any;
    if (!email || !accountId) {
      return reply.status(400).send({ message: 'email e accountId são obrigatórios.' });
    }

    // Find user by email
    const { rows: users } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (!users[0]) {
      return reply.status(404).send({ message: 'Usuário não encontrado com esse e-mail.' });
    }
    const sharedWithUserId = users[0].id;

    if (sharedWithUserId === request.userId) {
      return reply.status(400).send({ message: 'Você não pode compartilhar uma conta consigo mesmo.' });
    }

    // Verify account belongs to user
    const { rows: accounts } = await pool.query(
      'SELECT id FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, request.userId]
    );
    if (!accounts[0]) {
      return reply.status(404).send({ message: 'Conta não encontrada.' });
    }

    try {
      const share = await repo.invite(request.userId, sharedWithUserId, accountId);
      return reply.status(201).send(share);
    } catch (err: any) {
      if (err.code === '23505') {
        return reply.status(409).send({ message: 'Essa conta já está compartilhada com esse usuário.' });
      }
      throw err;
    }
  });

  // List accounts I shared with others
  app.get('/shared-accounts', async (request, reply) => {
    const rows = await repo.findByOwner(request.userId);
    const dtos: SharedAccountDTO[] = rows.map((r: any) => ({
      id: r.id,
      ownerId: r.owner_id,
      sharedWithUserId: r.shared_with_user_id,
      sharedWithUserName: r.shared_with_user_name,
      sharedWithUserEmail: r.shared_with_user_email,
      accountId: r.account_id,
      accountName: r.account_name,
    }));
    return reply.send(dtos);
  });

  // Remove a share
  app.delete('/shared-accounts/:id', async (request, reply) => {
    const { id } = request.params as any;
    const deleted = await repo.delete(id, request.userId);
    if (!deleted) return reply.status(404).send({ message: 'Compartilhamento não encontrado.' });
    return reply.status(204).send();
  });

  // List accounts shared WITH me
  app.get('/shared-with-me', async (request, reply) => {
    const rows = await repo.findBySharedUser(request.userId);
    return reply.send(rows.map((r: any) => ({
      id: r.id,
      ownerId: r.owner_id,
      ownerName: r.owner_name,
      ownerEmail: r.owner_email,
      accountId: r.account_id,
      accountName: r.account_name,
      balance: Number(r.balance),
      color: r.color,
      type: r.type,
    })));
  });

  // Get transactions from a shared account
  app.get('/shared-with-me/:accountId/transactions', async (request, reply) => {
    const { accountId } = request.params as any;

    // Find who owns this shared account for the current user
    const { rows } = await pool.query(
      'SELECT owner_id FROM shared_accounts WHERE account_id = $1 AND shared_with_user_id = $2',
      [accountId, request.userId]
    );
    if (!rows[0]) {
      return reply.status(404).send({ message: 'Conta compartilhada não encontrada.' });
    }

    const transactions = await repo.getSharedTransactions(accountId, rows[0].owner_id, request.userId);
    return reply.send(transactions.map((t: any) => ({
      id: t.id,
      description: t.description,
      amount: Number(t.amount),
      type: t.type,
      date: t.date,
      categoryName: t.category_name,
      categoryIcon: t.category_icon,
    })));
  });
}
