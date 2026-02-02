-- Add missing fields to providers table
-- 1. Add 'order' column for custom ordering of providers in the UI
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "order" INTEGER;

-- 2. Add 'commission_history' column to store historical commission rate changes
ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS commission_history JSONB DEFAULT '[]'::jsonb;

-- Create index on order column for better query performance
CREATE INDEX IF NOT EXISTS idx_providers_order ON public.providers("order");
