-- Migration to support anticipation history and validity (vigência)
-- Drops the old table if it exists to clean up redundant columns
DROP TABLE IF EXISTS public.financial_config;

CREATE TABLE public.financial_config (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    anticipation_rate NUMERIC(5,2) DEFAULT 1.79,
    anticipation_enabled BOOLEAN DEFAULT true,
    valid_from DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial record
INSERT INTO public.financial_config (anticipation_rate, anticipation_enabled, valid_from)
VALUES (1.79, true, CURRENT_DATE);

-- Update existing payment method rates as requested by user
UPDATE public.payment_settings SET fee = 0.70 WHERE method ILIKE '%Débito%';
UPDATE public.payment_settings SET fee = 0.80 WHERE method ILIKE '%Crédito%' AND method NOT ILIKE '%Parcelado%';
UPDATE public.payment_settings SET fee = 2.00 WHERE method ILIKE '%Crédito Parcelado%';
