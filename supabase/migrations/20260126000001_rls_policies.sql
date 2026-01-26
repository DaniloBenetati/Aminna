-- Enable RLS on all tables and create policies

-- Helper macro not available, so repeating for each table

-- 1. PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. PROVIDERS
ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.providers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.customers FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. SERVICES
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. STOCK ITEMS
ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.stock_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. PANTRY ITEMS
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.pantry_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 7. PARTNERS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.partners FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 8. LEADS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 9. CAMPAIGNS
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 10. APPOINTMENTS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. APPOINTMENT SERVICES
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.appointment_services FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 12. SALES
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.sales FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 13. SALE ITEMS
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.sale_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 14. USAGE LOGS
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.usage_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 15. PANTRY LOGS
ALTER TABLE public.pantry_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.pantry_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 16. FINANCIAL TRANSACTIONS
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.financial_transactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 17. COMMISSION HISTORY
ALTER TABLE public.commission_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated" ON public.commission_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
