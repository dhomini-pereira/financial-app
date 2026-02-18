export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'wallet' | 'checking' | 'digital' | 'investment';
  balance: number;
  color: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  accountId: string;
  date: string;
  recurring: boolean;
  recurrence?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  nextDueDate?: string | null;
  recurrenceCount?: number | null;
  recurrenceCurrent?: number;
  recurrenceGroupId?: string | null;
  recurrencePaused?: boolean;
}

export interface Investment {
  id: string;
  name: string;
  type: string;
  principal: number;
  currentValue: number;
  returnRate: number;
  startDate: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  icon: string;
}
