import { FastifyInstance } from 'fastify';
import { container } from '../container';
import { Pool } from 'pg';
import { authMiddleware } from '../middlewares/authMiddleware';
import type { InsightsDTO } from '../entities';

export async function insightsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authMiddleware);
  const pool = container.resolve<Pool>('DatabasePool');

  app.get('/insights', async (request, reply) => {
    const userId = request.userId;

    // 1. Upcoming recurring transactions (next month's forecast)
    const { rows: recurring } = await pool.query(
      `SELECT description, amount, type, next_due_date, recurrence
       FROM transactions
       WHERE user_id = $1
         AND recurring = true
         AND recurrence_paused = false
         AND next_due_date IS NOT NULL
         AND next_due_date <= (CURRENT_DATE + INTERVAL '30 days')::date
       ORDER BY next_due_date ASC`,
      [userId]
    );

    // 2. Last 12 months expenses by month
    const { rows: expenses } = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') AS month,
              COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1
         AND type = 'expense'
         AND account_id IS NOT NULL
         AND date::date >= (CURRENT_DATE - INTERVAL '12 months')::date
       GROUP BY DATE_TRUNC('month', date::date)
       ORDER BY month ASC`,
      [userId]
    );

    // 3. Last 12 months income by month
    const { rows: income } = await pool.query(
      `SELECT TO_CHAR(DATE_TRUNC('month', date::date), 'YYYY-MM') AS month,
              COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE user_id = $1
         AND type = 'income'
         AND account_id IS NOT NULL
         AND date::date >= (CURRENT_DATE - INTERVAL '12 months')::date
       GROUP BY DATE_TRUNC('month', date::date)
       ORDER BY month ASC`,
      [userId]
    );

    const expenseMonths = expenses.map((r: any) => ({ month: r.month, total: Number(r.total) }));
    const incomeMonths = income.map((r: any) => ({ month: r.month, total: Number(r.total) }));

    const avgExpense = expenseMonths.length > 0
      ? expenseMonths.reduce((s: number, e: any) => s + e.total, 0) / expenseMonths.length
      : 0;
    const avgIncome = incomeMonths.length > 0
      ? incomeMonths.reduce((s: number, e: any) => s + e.total, 0) / incomeMonths.length
      : 0;

    const dto: InsightsDTO = {
      upcomingRecurring: recurring.map((r: any) => ({
        description: r.description,
        amount: Number(r.amount),
        type: r.type,
        nextDueDate: r.next_due_date,
        recurrence: r.recurrence,
      })),
      last12MonthsExpenses: expenseMonths,
      last12MonthsIncome: incomeMonths,
      averageMonthlyExpense: Math.round(avgExpense * 100) / 100,
      averageMonthlyIncome: Math.round(avgIncome * 100) / 100,
    };

    return reply.send(dto);
  });
}
