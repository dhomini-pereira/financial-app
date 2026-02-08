import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { AuthService } from '../services/AuthService';
import { authMiddleware } from '../middlewares/authMiddleware';

export async function authRoutes(app: FastifyInstance) {
  const authService = container.resolve<AuthService>('AuthService');

  app.post('/auth/register', async (request, reply) => {
    const { name, email, password } = request.body as any;
    if (!name || !email || !password) {
      return reply.status(400).send({ message: 'Nome, email e senha são obrigatórios.' });
    }
    try {
      const result = await authService.register(name, email, password);
      return reply.status(201).send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const { email, password } = request.body as any;
    if (!email || !password) {
      return reply.status(400).send({ message: 'Email e senha são obrigatórios.' });
    }
    try {
      const result = await authService.login(email, password);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.post('/auth/refresh', async (request, reply) => {
    const { refreshToken } = request.body as any;
    if (!refreshToken) {
      return reply.status(400).send({ message: 'Refresh token é obrigatório.' });
    }
    try {
      const result = await authService.refresh(refreshToken);
      return reply.status(200).send(result);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.post('/auth/logout', { preHandler: authMiddleware }, async (request, reply) => {
    const { refreshToken } = request.body as any;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    return reply.status(204).send();
  });

  app.get('/auth/me', { preHandler: authMiddleware }, async (request, reply) => {
    try {
      const user = await authService.getProfile(request.userId);
      return reply.send(user);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });

  app.put('/auth/profile', { preHandler: authMiddleware }, async (request, reply) => {
    const { name, email } = request.body as any;
    try {
      const user = await authService.updateProfile(request.userId, { name, email });
      return reply.send(user);
    } catch (err: any) {
      return reply.status(err.statusCode || 500).send({ message: err.message });
    }
  });
}
