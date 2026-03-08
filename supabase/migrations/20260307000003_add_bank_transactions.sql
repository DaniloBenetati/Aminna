-- Create bank_transactions table
CREATE TABLE IF NOT EXISTS bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    description TEXT NOT NULL,
    document TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('RECEITA', 'DESPESA')),
    system_category TEXT,
    system_entity_name TEXT,
    system_payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Turn on RLS
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- Allow full access for authenticated users (assuming similar policy to others)
CREATE POLICY "Allow all operations for authenticated users on bank_transactions"
ON bank_transactions FOR ALL USING (auth.role() = 'authenticated');
