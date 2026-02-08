import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account, Transaction, Category, Investment, Goal } from '@/types/finance';
import { generateId, daysAgo } from '@/lib/finance';

const defaultCategories: Category[] = [
  { id: 'sal', name: 'Salário', icon: '💰', type: 'income' },
  { id: 'free', name: 'Freelance', icon: '💻', type: 'income' },
  { id: 'inv', name: 'Investimentos', icon: '📈', type: 'income' },
  { id: 'out', name: 'Outros', icon: '📋', type: 'income' },
  { id: 'alim', name: 'Alimentação', icon: '🍔', type: 'expense' },
  { id: 'trans', name: 'Transporte', icon: '🚗', type: 'expense' },
  { id: 'mor', name: 'Moradia', icon: '🏠', type: 'expense' },
  { id: 'laz', name: 'Lazer', icon: '🎮', type: 'expense' },
  { id: 'sau', name: 'Saúde', icon: '🏥', type: 'expense' },
  { id: 'edu', name: 'Educação', icon: '📚', type: 'expense' },
  { id: 'comp', name: 'Compras', icon: '🛒', type: 'expense' },
  { id: 'oute', name: 'Outros', icon: '📦', type: 'expense' },
];

const defaultAccounts: Account[] = [
  { id: 'wallet', name: 'Carteira', type: 'wallet', balance: 350, color: 'hsl(38, 92%, 50%)' },
  { id: 'nubank', name: 'Nubank', type: 'digital', balance: 3200, color: 'hsl(280, 70%, 50%)' },
  { id: 'inter', name: 'Banco Inter', type: 'checking', balance: 2800, color: 'hsl(24, 95%, 50%)' },
  { id: 'invest', name: 'Investimentos', type: 'investment', balance: 15000, color: 'hsl(199, 89%, 48%)' },
];

const defaultTransactions: Transaction[] = [
  { id: '1', description: 'Salário', amount: 5500, type: 'income', categoryId: 'sal', accountId: 'nubank', date: daysAgo(25), recurring: true, recurrence: 'monthly' },
  { id: '2', description: 'Freelance site', amount: 1200, type: 'income', categoryId: 'free', accountId: 'inter', date: daysAgo(18), recurring: false },
  { id: '3', description: 'Aluguel', amount: 1400, type: 'expense', categoryId: 'mor', accountId: 'nubank', date: daysAgo(24), recurring: true, recurrence: 'monthly' },
  { id: '4', description: 'Supermercado Extra', amount: 287, type: 'expense', categoryId: 'alim', accountId: 'nubank', date: daysAgo(3), recurring: false },
  { id: '5', description: 'Uber', amount: 45, type: 'expense', categoryId: 'trans', accountId: 'nubank', date: daysAgo(2), recurring: false },
  { id: '6', description: 'iFood', amount: 68, type: 'expense', categoryId: 'alim', accountId: 'nubank', date: daysAgo(1), recurring: false },
  { id: '7', description: 'Netflix', amount: 39.9, type: 'expense', categoryId: 'laz', accountId: 'nubank', date: daysAgo(10), recurring: true, recurrence: 'monthly' },
  { id: '8', description: 'Academia', amount: 120, type: 'expense', categoryId: 'sau', accountId: 'inter', date: daysAgo(20), recurring: true, recurrence: 'monthly' },
  { id: '9', description: 'Curso Udemy', amount: 27.9, type: 'expense', categoryId: 'edu', accountId: 'nubank', date: daysAgo(5), recurring: false },
  { id: '10', description: 'Gasolina', amount: 210, type: 'expense', categoryId: 'trans', accountId: 'wallet', date: daysAgo(4), recurring: false },
  { id: '11', description: 'Farmácia', amount: 85, type: 'expense', categoryId: 'sau', accountId: 'wallet', date: daysAgo(6), recurring: false },
  { id: '12', description: 'Restaurante', amount: 95, type: 'expense', categoryId: 'alim', accountId: 'inter', date: daysAgo(0), recurring: false },
  { id: '13', description: 'Energia elétrica', amount: 180, type: 'expense', categoryId: 'mor', accountId: 'nubank', date: daysAgo(15), recurring: true, recurrence: 'monthly' },
  { id: '14', description: 'Internet', amount: 99.9, type: 'expense', categoryId: 'mor', accountId: 'nubank', date: daysAgo(12), recurring: true, recurrence: 'monthly' },
];

const defaultInvestments: Investment[] = [
  { id: 'i1', name: 'CDB Banco Inter', type: 'CDB', principal: 8000, currentValue: 8450, returnRate: 12.5, startDate: '2024-06-01' },
  { id: 'i2', name: 'Tesouro Selic', type: 'Tesouro', principal: 5000, currentValue: 5320, returnRate: 13.25, startDate: '2024-03-15' },
  { id: 'i3', name: 'Reserva de emergência', type: 'Reserva', principal: 2000, currentValue: 2000, returnRate: 0, startDate: '2025-01-01' },
];

const defaultGoals: Goal[] = [
  { id: 'g1', name: 'Reserva de Emergência', targetAmount: 30000, currentAmount: 15770, deadline: '2026-12-31', icon: '🛡️' },
  { id: 'g2', name: 'Viagem Europa', targetAmount: 15000, currentAmount: 3500, deadline: '2027-06-01', icon: '✈️' },
  { id: 'g3', name: 'MacBook Pro', targetAmount: 12000, currentAmount: 4200, deadline: '2026-08-01', icon: '💻' },
];

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  investments: Investment[];
  goals: Goal[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  updateTransaction: (id: string, tx: Partial<Transaction>) => void;
  transfer: (fromId: string, toId: string, amount: number) => void;
  // Account management
  addAccount: (account: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, account: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  // Goal management
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  updateGoal: (id: string, goal: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      accounts: defaultAccounts,
      transactions: defaultTransactions,
      categories: defaultCategories,
      investments: defaultInvestments,
      goals: defaultGoals,
      addTransaction: (tx) => {
        const newTx = { ...tx, id: generateId() };
        const accounts = get().accounts.map((a) => {
          if (a.id === tx.accountId) {
            return { ...a, balance: tx.type === 'income' ? a.balance + tx.amount : a.balance - tx.amount };
          }
          return a;
        });
        set({ transactions: [newTx, ...get().transactions], accounts });
      },
      deleteTransaction: (id) => {
        const tx = get().transactions.find((t) => t.id === id);
        if (!tx) return;
        const accounts = get().accounts.map((a) => {
          if (a.id === tx.accountId) {
            return { ...a, balance: tx.type === 'income' ? a.balance - tx.amount : a.balance + tx.amount };
          }
          return a;
        });
        set({ transactions: get().transactions.filter((t) => t.id !== id), accounts });
      },
      updateTransaction: (id, updates) => {
        set({ transactions: get().transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)) });
      },
      transfer: (fromId, toId, amount) => {
        set({
          accounts: get().accounts.map((a) => {
            if (a.id === fromId) return { ...a, balance: a.balance - amount };
            if (a.id === toId) return { ...a, balance: a.balance + amount };
            return a;
          }),
        });
      },
      // Account management
      addAccount: (account) => {
        const newAccount = { ...account, id: generateId() };
        set({ accounts: [...get().accounts, newAccount] });
      },
      updateAccount: (id, updates) => {
        set({ accounts: get().accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)) });
      },
      deleteAccount: (id) => {
        set({ accounts: get().accounts.filter((a) => a.id !== id) });
      },
      // Goal management
      addGoal: (goal) => {
        const newGoal = { ...goal, id: generateId() };
        set({ goals: [...get().goals, newGoal] });
      },
      updateGoal: (id, updates) => {
        set({ goals: get().goals.map((g) => (g.id === id ? { ...g, ...updates } : g)) });
      },
      deleteGoal: (id) => {
        set({ goals: get().goals.filter((g) => g.id !== id) });
      },
    }),
    { name: 'finance-data' }
  )
);
