CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);

-- Accounts
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('wallet', 'checking', 'digital', 'investment')),
  balance DECIMAL(15,2) DEFAULT 0,
  color VARCHAR(20) DEFAULT '#2563eb',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accounts_user ON accounts(user_id);

-- Categories
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(10) DEFAULT '📋',
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);

-- Transactions
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'expense')),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recurring BOOLEAN DEFAULT false,
  recurrence VARCHAR(20) CHECK (recurrence IN ('daily', 'weekly', 'monthly', 'yearly')),
  next_due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account_id);

-- Investments
CREATE TABLE IF NOT EXISTS investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  principal DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2) NOT NULL,
  return_rate DECIMAL(8,4) DEFAULT 0,
  start_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);

-- Goals
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  target_amount DECIMAL(15,2) NOT NULL,
  current_amount DECIMAL(15,2) DEFAULT 0,
  deadline DATE,
  icon VARCHAR(10) DEFAULT '🎯',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);

-- Migrations incrementais (safe para re-execução)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'next_due_date'
  ) THEN
    ALTER TABLE transactions ADD COLUMN next_due_date DATE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_recurring ON transactions(recurring, next_due_date) WHERE recurring = true;

-- Adiciona colunas de parcelas (safe para re-execução)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurrence_count'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurrence_count INT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurrence_current'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurrence_current INT DEFAULT 0;
  END IF;
END $$;

-- Índice para buscas por range de datas (filtros de gastos)
CREATE INDEX IF NOT EXISTS idx_transactions_date_only ON transactions(date);

-- Coluna para agrupar transações geradas por uma recorrência
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurrence_group_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurrence_group_id UUID;
  END IF;
END $$;

-- Coluna para pausar recorrência sem apagar
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'recurrence_paused'
  ) THEN
    ALTER TABLE transactions ADD COLUMN recurrence_paused BOOLEAN DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_group ON transactions(recurrence_group_id) WHERE recurrence_group_id IS NOT NULL;

-- Push notification tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);

-- Credit Cards
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  card_limit DECIMAL(15,2) NOT NULL DEFAULT 0,
  closing_day INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
  due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  color VARCHAR(20) DEFAULT '#8b5cf6',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_cards_user ON credit_cards(user_id);

-- Melhor dia de compra (calculado a partir do fechamento, mas editável pelo usuário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_cards' AND column_name = 'best_purchase_day'
  ) THEN
    ALTER TABLE credit_cards ADD COLUMN best_purchase_day INTEGER DEFAULT NULL;
  END IF;
END $$;

-- Coluna para vincular transação a um cartão de crédito (opcional)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'credit_card_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_credit_card ON transactions(credit_card_id) WHERE credit_card_id IS NOT NULL;

-- Coluna para indicar número da parcela no cartão (ex: 3/12)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'installments'
  ) THEN
    ALTER TABLE transactions ADD COLUMN installments INT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'installment_current'
  ) THEN
    ALTER TABLE transactions ADD COLUMN installment_current INT;
  END IF;
END $$;

-- Invoices (faturas de cartão de crédito)
CREATE TABLE IF NOT EXISTS credit_card_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_card_id UUID NOT NULL REFERENCES credit_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_month VARCHAR(7) NOT NULL, -- 'YYYY-MM'
  total DECIMAL(15,2) DEFAULT 0,
  paid BOOLEAN DEFAULT false,
  paid_at TIMESTAMPTZ,
  paid_with_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(credit_card_id, reference_month)
);

CREATE INDEX IF NOT EXISTS idx_invoices_card ON credit_card_invoices(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user ON credit_card_invoices(user_id);

-- Coluna paid_amount para registrar valor no momento do pagamento (para unpay correto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'credit_card_invoices' AND column_name = 'paid_amount'
  ) THEN
    ALTER TABLE credit_card_invoices ADD COLUMN paid_amount DECIMAL(15,2) DEFAULT 0;
  END IF;
END $$;

-- Family Members
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_family_members_user ON family_members(user_id);

-- Coluna family_member_id nas transações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'family_member_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN family_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Shared Accounts (somente leitura)
CREATE TABLE IF NOT EXISTS shared_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(shared_with_user_id, account_id)
);
CREATE INDEX IF NOT EXISTS idx_shared_accounts_owner ON shared_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_shared_accounts_shared ON shared_accounts(shared_with_user_id);
