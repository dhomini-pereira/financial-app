import 'dotenv/config';

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-secret-change-me',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret-change-me',
  CRON_SECRET: process.env.CRON_SECRET ?? '',
  PORT: Number(process.env.PORT) || 3333,
};
