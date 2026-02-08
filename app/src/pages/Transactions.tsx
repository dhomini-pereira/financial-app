import { useState, useMemo } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, maskValue, formatDateShort } from '@/lib/finance';
import TransactionForm from '@/components/finance/TransactionForm';
import PrivacyToggle from '@/components/finance/PrivacyToggle';
import { Input } from '@/components/ui/input';
import { Search, Trash2 } from 'lucide-react';

const Transactions = () => {
  const { transactions, categories, deleteTransaction } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');

  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const getCat = (id: string) => categories.find((c) => c.id === id);

  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    if (filter !== 'all') list = list.filter((t) => t.type === filter);
    if (search) list = list.filter((t) => t.description.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [transactions, filter, search]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Transações</h1>
        <PrivacyToggle />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar transação..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'income', 'expense'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'income' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">Nenhuma transação encontrada</p>
        )}
        {filtered.map((tx) => {
          const cat = getCat(tx.categoryId);
          return (
            <div key={tx.id} className="stat-card flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="text-xl">{cat?.icon ?? '📋'}</span>
                <div>
                  <p className="text-sm font-medium">{tx.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {cat?.name} · {formatDateShort(tx.date)}
                    {tx.recurring && ' · 🔄'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-income' : 'text-expense'}`}>
                  {tx.type === 'income' ? '+' : '-'}{mv(tx.amount)}
                </p>
                <button
                  onClick={() => deleteTransaction(tx.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <TransactionForm />
    </div>
  );
};

export default Transactions;
