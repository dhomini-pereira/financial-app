import { useFinanceStore } from '@/store/useFinanceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, maskValue } from '@/lib/finance';
import PrivacyToggle from '@/components/finance/PrivacyToggle';
import { Wallet, Building, Smartphone, TrendingUp } from 'lucide-react';

const iconMap = {
  wallet: Wallet,
  checking: Building,
  digital: Smartphone,
  investment: TrendingUp,
};

const typeLabels = {
  wallet: 'Carteira',
  checking: 'Conta Corrente',
  digital: 'Conta Digital',
  investment: 'Investimentos',
};

const Accounts = () => {
  const { accounts } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Contas</h1>
        <PrivacyToggle />
      </div>

      <div className="balance-card mb-6 animate-slide-up">
        <p className="text-sm opacity-80">Saldo consolidado</p>
        <p className="text-3xl font-bold mt-1">{mv(total)}</p>
      </div>

      <div className="space-y-3">
        {accounts.map((account) => {
          const Icon = iconMap[account.type];
          return (
            <div key={account.id} className="stat-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: account.color + '20' }}>
                  <Icon className="h-5 w-5" style={{ color: account.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-[11px] text-muted-foreground">{typeLabels[account.type]}</p>
                </div>
              </div>
              <p className="font-semibold">{mv(account.balance)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Accounts;
