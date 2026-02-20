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
  type: "wallet" | "checking" | "digital" | "investment";
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
  type: "income" | "expense";
  created_at: Date;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  credit_card_id: string | null;
  description: string;
  amount: number;
  type: "income" | "expense";
  date: string;
  recurring: boolean;
  recurrence: "daily" | "weekly" | "monthly" | "yearly" | null;
  next_due_date: string | null;
  recurrence_count: number | null;
  recurrence_current: number;
  recurrence_group_id: string | null;
  recurrence_paused: boolean;
  installments: number | null;
  installment_current: number | null;
  created_at: Date;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
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

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  card_limit: number;
  closing_day: number;
  due_day: number;
  best_purchase_day: number | null;
  color: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreditCardInvoice {
  id: string;
  credit_card_id: string;
  user_id: string;
  reference_month: string;
  total: number;
  paid: boolean;
  paid_at: Date | null;
  paid_with_account_id: string | null;
  created_at: Date;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: Date;
  created_at: Date;
}

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
  creditCardId: string | null;
  date: string;
  recurring: boolean;
  recurrence: string | null;
  nextDueDate: string | null;
  recurrenceCount: number | null;
  recurrenceCurrent: number;
  recurrenceGroupId: string | null;
  recurrencePaused: boolean;
  installments: number | null;
  installmentCurrent: number | null;
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

export interface CreditCardDTO {
  id: string;
  name: string;
  limit: number;
  closingDay: number;
  dueDay: number;
  bestPurchaseDay: number;
  color: string;
  usedAmount: number;
  availableLimit: number;
}

export interface CreditCardInvoiceDTO {
  id: string;
  creditCardId: string;
  referenceMonth: string;
  total: number;
  paid: boolean;
  paidAt: string | null;
  paidWithAccountId: string | null;
}
