-- Supplemental Migration: Add missing settings tables
-- Detected usage in App.tsx that was missing from the previous sync.

-- 1. EXPENSE CATEGORIES
CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    dre_class TEXT CHECK (dre_class IN ('COSTS', 'EXPENSE_SALES', 'EXPENSE_ADM', 'EXPENSE_FIN', 'TAX', 'DEDUCTION')),
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PAYMENT SETTINGS (Taxas e Prazos)
CREATE TABLE IF NOT EXISTS public.payment_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    method TEXT NOT NULL,
    icon_name TEXT,
    fee NUMERIC(5,2) DEFAULT 0.00,
    days INTEGER DEFAULT 0,
    color TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. COMMISSION SETTINGS (Ciclos de Pagamento)
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id TEXT PRIMARY KEY, -- '1' or '2'
    start_day INTEGER NOT NULL,
    end_day TEXT NOT NULL, -- Stored as text to handle 'last' or number
    payment_day INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default Commission Settings if empty
INSERT INTO public.commission_settings (id, start_day, end_day, payment_day)
VALUES 
    ('1', 1, '15', 20),
    ('2', 16, 'last', 5)
ON CONFLICT (id) DO NOTHING;

-- Insert default Expense Categories if empty
INSERT INTO public.expense_categories (name, dre_class, is_system)
VALUES 
    ('Aluguel', 'EXPENSE_ADM', true),
    ('Marketing', 'EXPENSE_SALES', true),
    ('Comissões', 'COSTS', true),
    ('Produtos', 'COSTS', true),
    ('Impostos', 'TAX', true)
ON CONFLICT DO NOTHING;
