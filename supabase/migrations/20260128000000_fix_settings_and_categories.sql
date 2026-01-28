-- Fix expense_categories table
ALTER TABLE public.expense_categories ALTER COLUMN id SET DEFAULT uuid_generate_v4()::text;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.expense_categories;
CREATE POLICY "Enable all for authenticated" ON public.expense_categories FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Fix commission_settings table
ALTER TABLE public.commission_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.commission_settings;
CREATE POLICY "Enable all for authenticated" ON public.commission_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed commission_settings
INSERT INTO public.commission_settings (id, start_day, end_day, payment_day)
VALUES 
('1', 1, '15', 20),
('2', 16, 'last', 5)
ON CONFLICT (id) DO UPDATE SET 
    start_day = EXCLUDED.start_day,
    end_day = EXCLUDED.end_day,
    payment_day = EXCLUDED.payment_day;

-- Fix payment_settings table
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for authenticated" ON public.payment_settings;
CREATE POLICY "Enable all for authenticated" ON public.payment_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed payment_settings
INSERT INTO public.payment_settings (id, method, icon_name, fee, days, color)
VALUES 
('pay-1', 'Pix', 'Smartphone', 0.00, 0, 'text-emerald-500'),
('pay-2', 'Cartão de Débito', 'CreditCard', 1.99, 1, 'text-indigo-500'),
('pay-3', 'Cartão de Crédito', 'CreditCard', 3.49, 30, 'text-blue-500'),
('pay-4', 'Dinheiro', 'Banknote', 0.00, 0, 'text-green-500')
ON CONFLICT (id) DO NOTHING;
