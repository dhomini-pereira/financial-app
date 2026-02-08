import { useMemo } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, getMonthDates, formatDateShort } from '@/lib/finance';
import PrivacyToggle from '@/components/finance/PrivacyToggle';
import TransactionForm from '@/components/finance/TransactionForm';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  const { user, privacyMode } = useAuthStore();
  const { accounts, transactions, categories } = useFinanceStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const { start, end } = getMonthDates();

  const monthTx = useMemo(
    () => transactions.filter((t) => t.date >= start && t.date <= end),
    [transactions, start, end]
  );

  const totalIncome = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days[key] = 0;
    }
    monthTx.filter((t) => t.type === 'expense').forEach((t) => {
      if (days[t.date] !== undefined) days[t.date] += t.amount;
    });
    return Object.entries(days).map(([date, value]) => ({ date: formatDateShort(date), value }));
  }, [monthTx]);

  const recentTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const getCat = (id: string) => categories.find((c) => c.id === id);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <p className="text-sm text-muted-foreground">Olá, {user?.name ?? 'Usuário'} 👋</p>
          <h1 className="text-xl font-bold">Dashboard</h1>
        </div>
        <PrivacyToggle />
      </div>

      {/* Balance Card */}
      <div className="balance-card mb-4 animate-slide-up">
        <p className="text-sm opacity-80">Saldo total</p>
        <p className="text-3xl font-bold mt-1">{mv(totalBalance)}</p>
        <div className="flex gap-6 mt-4">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4" />
            <div>
              <p className="text-[10px] opacity-70">Receitas</p>
              <p className="text-sm font-semibold">{mv(totalIncome)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="h-4 w-4" />
            <div>
              <p className="text-[10px] opacity-70">Despesas</p>
              <p className="text-sm font-semibold">{mv(totalExpense)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="stat-card mb-4">
        <p className="text-sm font-medium mb-3">Gastos últimos 7 dias</p>
        {privacyMode ? (
          <div className="h-[120px] flex items-center justify-center text-muted-foreground text-sm">Oculto</div>
        ) : (
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(158, 64%, 42%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(158, 64%, 42%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="value" stroke="hsl(158, 64%, 42%)" fill="url(#grad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-income" />
            <span className="text-xs text-muted-foreground">Receitas</span>
          </div>
          <p className="font-bold text-income">{mv(totalIncome)}</p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="h-4 w-4 text-expense" />
            <span className="text-xs text-muted-foreground">Despesas</span>
          </div>
          <p className="font-bold text-expense">{mv(totalExpense)}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold mb-3">Transações recentes</h2>
        <div className="space-y-2">
          {recentTx.map((tx) => {
            const cat = getCat(tx.categoryId);
            return (
              <div key={tx.id} className="stat-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cat?.icon ?? '📋'}</span>
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-[11px] text-muted-foreground">{cat?.name} · {formatDateShort(tx.date)}</p>
                  </div>
                </div>
                <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'}{mv(tx.amount)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <TransactionForm />
    </div>
  );
};

export default Dashboard;
