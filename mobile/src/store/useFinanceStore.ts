import { create } from 'zustand';
import {
  accountsApi,
  transactionsApi,
  categoriesApi,
  investmentsApi,
  goalsApi,
  transfersApi,
} from '@/services/api';
import type {
  Account,
  Category,
  Transaction,
  Investment,
  Goal,
} from '@/types/finance';

interface FinanceState {
  accounts: Account[];
  transactions: Transaction[];
  categories: Category[];
  investments: Investment[];
  goals: Goal[];
  loading: boolean;
  error: string | null;

  // Fetch all from API
  fetchAll: () => Promise<void>;
  reset: () => void;

  // Accounts
  addAccount: (data: Omit<Account, 'id'>) => Promise<void>;
  updateAccount: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;

  // Transactions
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Transfer
  transfer: (fromId: string, toId: string, amount: number, description?: string) => Promise<void>;

  // Categories
  addCategory: (data: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Investments
  addInvestment: (data: Omit<Investment, 'id'>) => Promise<void>;
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<void>;
  deleteInvestment: (id: string) => Promise<void>;

  // Goals
  addGoal: (data: Omit<Goal, 'id'>) => Promise<void>;
  updateGoal: (id: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
}

const initialState = {
  accounts: [] as Account[],
  transactions: [] as Transaction[],
  categories: [] as Category[],
  investments: [] as Investment[],
  goals: [] as Goal[],
  loading: false,
  error: null as string | null,
};

export const useFinanceStore = create<FinanceState>()((set, get) => ({
  ...initialState,

  fetchAll: async () => {
    try {
      set({ loading: true, error: null });
      const [accounts, transactions, categories, investments, goals] = await Promise.all([
        accountsApi.getAll(),
        transactionsApi.getAll(),
        categoriesApi.getAll(),
        investmentsApi.getAll(),
        goalsApi.getAll(),
      ]);
      set({ accounts, transactions, categories, investments, goals, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Erro ao carregar dados.' });
    }
  },

  reset: () => set(initialState),

  // ========== ACCOUNTS ==========
  addAccount: async (data) => {
    try {
      const account = await accountsApi.create(data as any);
      set({ accounts: [...get().accounts, account] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateAccount: async (id, data) => {
    try {
      const updated = await accountsApi.update(id, data);
      set({ accounts: get().accounts.map((a) => (a.id === id ? updated : a)) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteAccount: async (id) => {
    try {
      await accountsApi.delete(id);
      set({ accounts: get().accounts.filter((a) => a.id !== id) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ========== TRANSACTIONS ==========
  addTransaction: async (data) => {
    try {
      const tx = await transactionsApi.create(data);
      set({ transactions: [...get().transactions, tx] });
      // Atualiza o saldo da conta localmente (o back-end já fez o cálculo)
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteTransaction: async (id) => {
    try {
      await transactionsApi.delete(id);
      set({ transactions: get().transactions.filter((t) => t.id !== id) });
      // Atualiza saldos
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ========== TRANSFER ==========
  transfer: async (fromId, toId, amount, description) => {
    try {
      await transfersApi.create({ fromAccountId: fromId, toAccountId: toId, amount, description });
      // Recarrega tudo (contas e transações mudam)
      await get().fetchAll();
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ========== CATEGORIES ==========
  addCategory: async (data) => {
    try {
      const cat = await categoriesApi.create(data as any);
      set({ categories: [...get().categories, cat] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateCategory: async (id, data) => {
    try {
      const updated = await categoriesApi.update(id, data);
      set({ categories: get().categories.map((c) => (c.id === id ? updated : c)) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteCategory: async (id) => {
    try {
      await categoriesApi.delete(id);
      set({ categories: get().categories.filter((c) => c.id !== id) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ========== INVESTMENTS ==========
  addInvestment: async (data) => {
    try {
      const inv = await investmentsApi.create(data);
      set({ investments: [...get().investments, inv] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateInvestment: async (id, data) => {
    try {
      const updated = await investmentsApi.update(id, data);
      set({ investments: get().investments.map((i) => (i.id === id ? updated : i)) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteInvestment: async (id) => {
    try {
      await investmentsApi.delete(id);
      set({ investments: get().investments.filter((i) => i.id !== id) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  // ========== GOALS ==========
  addGoal: async (data) => {
    try {
      const goal = await goalsApi.create(data);
      set({ goals: [...get().goals, goal] });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  updateGoal: async (id, data) => {
    try {
      const updated = await goalsApi.update(id, data);
      set({ goals: get().goals.map((g) => (g.id === id ? updated : g)) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  deleteGoal: async (id) => {
    try {
      await goalsApi.delete(id);
      set({ goals: get().goals.filter((g) => g.id !== id) });
    } catch (err: any) {
      set({ error: err.message });
    }
  },
}));
