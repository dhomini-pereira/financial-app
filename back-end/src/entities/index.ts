export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: 'wallet' | 'checking' | 'digital' | 'investment';
  balance: number;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
  created_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  recurring: boolean;
  recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly' | null;
  created_at: Date;
}

export interface Investment {
  id: string;
  user_id: string;
  name: string;
  type: string;
  principal: number;
  current_value: number;
  return_rate: number;
  start_date: string;
  created_at: Date;
  updated_at: Date;
}

export interface Goal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string;
  created_at: Date;
  updated_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

// DTOs (sem campos internos)
export interface UserDTO {
  id: string;
  name: string;
  email: string;
}

export interface AccountDTO {
  id: string;
  name: string;
  type: string;
  balance: number;
  color: string;
}

export interface CategoryDTO {
  id: string;
  name: string;
  icon: string;
  type: string;
}

export interface TransactionDTO {
  id: string;
  description: string;
  amount: number;
  type: string;
  categoryId: string | null;
  accountId: string | null;
  date: string;
  recurring: boolean;
  recurrence: string | null;
}

export interface InvestmentDTO {
  id: string;
  name: string;
  type: string;
  principal: number;
  currentValue: number;
  returnRate: number;
  startDate: string;
}

export interface GoalDTO {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  icon: string;
}
