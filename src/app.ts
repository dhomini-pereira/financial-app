import './container';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { authRoutes } from './routes/auth';
import { accountRoutes } from './routes/accounts';
import { transactionRoutes } from './routes/transactions';
import { categoryRoutes } from './routes/categories';
import { investmentRoutes } from './routes/investments';
import { goalRoutes } from './routes/goals';
import { cronRoutes } from './routes/cron';
import { pushTokenRoutes } from './routes/pushTokens';
import { creditCardRoutes } from './routes/creditCards';
import { familyMemberRoutes } from './routes/familyMembers';
import { sharedAccountRoutes } from './routes/sharedAccounts';
import { insightsRoutes } from './routes/insights';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(authRoutes);
  await app.register(accountRoutes);
  await app.register(transactionRoutes);
  await app.register(categoryRoutes);
  await app.register(investmentRoutes);
  await app.register(goalRoutes);
  await app.register(cronRoutes);
  await app.register(pushTokenRoutes);
  await app.register(creditCardRoutes);
  await app.register(familyMemberRoutes);
  await app.register(sharedAccountRoutes);
  await app.register(insightsRoutes);

  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

  return app;
}
