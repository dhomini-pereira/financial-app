import './container';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth';
import { accountRoutes } from './routes/accounts';
import { transactionRoutes } from './routes/transactions';
import { categoryRoutes } from './routes/categories';
import { investmentRoutes } from './routes/investments';
import { goalRoutes } from './routes/goals';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Routes
  await app.register(authRoutes);
  await app.register(accountRoutes);
  await app.register(transactionRoutes);
  await app.register(categoryRoutes);
  await app.register(investmentRoutes);
  await app.register(goalRoutes);

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}
