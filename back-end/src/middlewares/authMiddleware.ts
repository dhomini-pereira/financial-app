import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from '../container';
import { AuthService } from '../services/AuthService';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return reply.status(401).send({ message: 'Token não fornecido.' });
  }

  const token = header.slice(7);
  try {
    const authService = container.resolve<AuthService>('AuthService');
    const payload = authService.verifyAccessToken(token);
    request.userId = payload.sub;
  } catch (err: any) {
    return reply.status(401).send({ message: err.message || 'Token inválido.' });
  }
}
