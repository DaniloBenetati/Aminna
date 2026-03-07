-- Add is_reconciled to expenses
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT false;

-- Add is_reconciled to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS is_reconciled BOOLEAN DEFAULT false;
