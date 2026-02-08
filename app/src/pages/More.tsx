import { useFinanceStore } from '@/store/useFinanceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, maskValue } from '@/lib/finance';
import { useNavigate, Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Moon, LogOut, Download, TrendingUp, Target, CreditCard, ChevronRight } from 'lucide-react';
import PrivacyToggle from '@/components/finance/PrivacyToggle';

const More = () => {
  const { investments, goals, transactions } = useFinanceStore();
  const { privacyMode, darkMode, toggleDarkMode, logout } = useAuthStore();
  const navigate = useNavigate();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalReturn = investments.reduce((s, i) => s + (i.currentValue - i.principal), 0);

  const handleExport = () => {
    const data = JSON.stringify({ transactions }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'financas-export.json';
    a.click();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Mais</h1>
        <PrivacyToggle />
      </div>

      {/* Investments */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-investment" />
          <h2 className="text-sm font-semibold">Investimentos</h2>
        </div>
        <div className="stat-card mb-2">
          <div className="flex justify-between mb-1">
            <span className="text-sm text-muted-foreground">Total investido</span>
            <span className="font-semibold">{mv(totalInvested)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Rendimento</span>
            <span className="font-semibold text-income">{mv(totalReturn)}</span>
          </div>
        </div>
        <div className="space-y-2">
          {investments.map((inv) => (
            <div key={inv.id} className="stat-card">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium">{inv.name}</p>
                  <p className="text-[11px] text-muted-foreground">{inv.type} · {inv.returnRate}% a.a.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{mv(inv.currentValue)}</p>
                  <p className="text-[11px] text-income">+{mv(inv.currentValue - inv.principal)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Goals */}
      <section className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-warning" />
          <h2 className="text-sm font-semibold">Metas</h2>
        </div>
        <div className="space-y-2">
          {goals.map((goal) => {
            const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            return (
              <div key={goal.id} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{goal.icon}</span>
                    <p className="text-sm font-medium">{goal.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
                <Progress value={pct} className="h-2 mb-1" />
                <div className="flex justify-between">
                  <span className="text-[11px] text-muted-foreground">{mv(goal.currentAmount)}</span>
                  <span className="text-[11px] text-muted-foreground">{mv(goal.targetAmount)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Management */}
      <section className="mb-6">
        <h2 className="text-sm font-semibold mb-3">Gerenciamento</h2>
        <div className="space-y-1">
          <Link to="/manage-accounts" className="stat-card flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Gerenciar Contas</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link to="/manage-goals" className="stat-card flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <Target className="h-4 w-4 text-warning" />
              <span className="text-sm">Gerenciar Metas</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {/* Settings */}
      <section>
        <h2 className="text-sm font-semibold mb-3">Configurações</h2>
        <div className="space-y-1">
          <div className="stat-card flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Modo escuro</span>
            </div>
            <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
          </div>
          <button onClick={handleExport} className="stat-card flex items-center gap-3 w-full text-left">
            <Download className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Exportar dados (JSON)</span>
          </button>
          <button onClick={handleLogout} className="stat-card flex items-center gap-3 w-full text-left">
            <LogOut className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">Sair</span>
          </button>
        </div>
      </section>
    </div>
  );
};

export default More;
