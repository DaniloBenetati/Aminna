-- Full Database Synchronization Script
-- This script ensures all tables and columns defined in the application exist in Supabase.
-- It is idempotent and safe to run multiple times.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROVIDERS (Profissionais)
CREATE TABLE IF NOT EXISTS public.providers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT,
    specialties TEXT[], 
    commission_rate NUMERIC(5,4) DEFAULT 0.00, -- Changed to 5,4 to allow precision
    avatar TEXT,
    phone TEXT,
    birth_date DATE,
    pix_key TEXT,
    active BOOLEAN DEFAULT true,
    work_days INTEGER[], 
    "order" INTEGER,
    commission_history JSONB DEFAULT '[]'::jsonb,
    custom_durations JSONB DEFAULT '{}'::jsonb,
    fiscal_config_id UUID, -- Added later
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ 
BEGIN 
    ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS "order" INTEGER;
    ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS commission_history JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS custom_durations JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.providers ADD COLUMN IF NOT EXISTS fiscal_config_id UUID;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 3. CUSTOMERS (Clientes)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    birth_date DATE,
    address TEXT,
    cpf TEXT,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    last_visit TIMESTAMP WITH TIME ZONE,
    total_spent NUMERIC(10,2) DEFAULT 0.00,
    status TEXT CHECK (status IN ('VIP', 'Regular', 'Risco de Churn', 'Novo', 'Restrito')),
    is_blocked BOOLEAN DEFAULT false,
    block_reason TEXT,
    assigned_provider_id UUID REFERENCES public.providers(id),
    assigned_provider_ids TEXT[], -- Changed to TEXT[] to match types.ts usage often
    restricted_provider_ids UUID[], 
    preferences JSONB DEFAULT '{}'::jsonb,
    observations TEXT,
    acquisition_channel TEXT,
    outstanding_balance NUMERIC(10,2) DEFAULT 0.00,
    history JSONB DEFAULT '[]'::jsonb, -- Store history in JSONB for flexibility or use separate table? types.ts suggests strict structure but often stored as JSON. Let's assume JSONB for now or separate table. Wait, initial schema didn't have history table. Let's add history column JSONB.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ 
BEGIN 
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS block_reason TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS assigned_provider_ids TEXT[]; -- types.ts says string[], often stored as text array
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS acquisition_channel TEXT;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS outstanding_balance NUMERIC(10,2) DEFAULT 0.00;
    ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS history JSONB DEFAULT '[]'::jsonb;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 4. SERVICES (Catálogo)
CREATE TABLE IF NOT EXISTS public.services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    required_specialty TEXT,
    category TEXT,
    active BOOLEAN DEFAULT true,
    price_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ 
BEGIN 
    ALTER TABLE public.services ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT '[]'::jsonb;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 5. STOCK ITEMS (Estoque)
CREATE TABLE IF NOT EXISTS public.stock_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    category TEXT CHECK (category IN ('Uso Interno', 'Venda')),
    "group" TEXT,
    sub_group TEXT,
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 5,
    unit TEXT,
    cost_price NUMERIC(10,2) DEFAULT 0.00,
    sale_price NUMERIC(10,2), 
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. PANTRY ITEMS (Copa) - Previously defined
CREATE TABLE IF NOT EXISTS public.pantry_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    category TEXT CHECK (category IN ('Bebida', 'Alimento', 'Outro')),
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 10,
    cost_price NUMERIC(10,2) DEFAULT 0.00,
    reference_price NUMERIC(10,2) DEFAULT 0.00, 
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. PARTNERS (Parceiros)
CREATE TABLE IF NOT EXISTS public.partners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    social_media TEXT,
    category TEXT,
    phone TEXT,
    email TEXT,
    document TEXT,
    address TEXT,
    partnership_type TEXT CHECK (partnership_type IN ('PERMUTA', 'PAGO')),
    pix_key TEXT,
    notes TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. LEADS (CRM)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    status TEXT CHECK (status IN ('NOVO', 'ATENDIMENTO', 'QUALIFICADO', 'PROPOSTA', 'CONVERTIDO', 'PERDIDO')),
    notes TEXT,
    lost_reason TEXT,
    estimated_value NUMERIC(10,2),
    service_interest TEXT,
    tags TEXT[],
    temperature TEXT CHECK (temperature IN ('quente', 'frio', 'morno')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ 
BEGIN 
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS tags TEXT[];
    ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS temperature TEXT CHECK (temperature IN ('quente', 'frio', 'morno'));
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 9. CAMPAIGNS (Marketing)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    partner_id UUID REFERENCES public.partners(id),
    name TEXT NOT NULL,
    coupon_code TEXT NOT NULL UNIQUE,
    discount_type TEXT CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
    discount_value NUMERIC(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    use_count INTEGER DEFAULT 0,
    max_uses INTEGER,
    total_revenue_generated NUMERIC(10,2) DEFAULT 0.00,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. APPOINTMENTS (Agendamentos)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id),
    provider_id UUID REFERENCES public.providers(id),
    service_id UUID REFERENCES public.services(id),
    date DATE NOT NULL,
    time TIME NOT NULL,
    end_time TEXT, -- Stored as text usually "HH:MM"
    status TEXT CHECK (status IN ('Confirmado', 'Pendente', 'Concluído', 'Cancelado', 'Em Andamento')),
    payment_date TIMESTAMP WITH TIME ZONE,
    price_paid NUMERIC(10,2),
    booked_price NUMERIC(10,2), 
    commission_rate_snapshot NUMERIC(5,4), 
    is_courtesy BOOLEAN DEFAULT false,
    applied_coupon TEXT,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    payment_method TEXT,
    combined_service_names TEXT,
    products_used TEXT[], -- Legacy
    group_id UUID,
    recurrence_id UUID,
    main_service_products TEXT[],
    additional_services JSONB DEFAULT '[]'::jsonb, -- Store details of extras
    rating INTEGER,
    feedback TEXT,
    nfse_record_id UUID, -- For fiscal
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

DO $$ 
BEGIN 
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS end_time TEXT;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS products_used TEXT[];
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS group_id UUID;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS recurrence_id UUID;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS main_service_products TEXT[];
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS additional_services JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS rating INTEGER;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS feedback TEXT;
    ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS nfse_record_id UUID;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- 11. FINANCEIRO (Transactions/Expenses - Combined or Separate?)
-- types.ts defines FinancialTransaction, Expense, Supplier
-- Let's enable FinancialTransaction as the main ledger? No, app often uses separate tables.
-- Let's create 'expenses' and 'financial_transactions' tables.

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    subcategory TEXT,
    dre_class TEXT CHECK (dre_class IN ('COSTS', 'EXPENSE_SALES', 'EXPENSE_ADM', 'EXPENSE_FIN', 'TAX', 'DEDUCTION')),
    amount NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('Pago', 'Pendente')),
    payment_method TEXT CHECK (payment_method IN ('Boleto', 'Pix', 'Transferência', 'Cartão', 'Dinheiro')),
    supplier_id UUID, -- References suppliers if exists
    recurring_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    document TEXT,
    phone TEXT,
    email TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    type TEXT CHECK (type IN ('RECEITA', 'DESPESA')),
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT CHECK (status IN ('Pago', 'Pendente', 'Previsto', 'Atrasado')),
    payment_method TEXT,
    origin TEXT CHECK (origin IN ('Serviço', 'Produto', 'Despesa', 'Outro')),
    related_id UUID, 
    customer_or_provider_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. FISCAL & INTEGRAÇÃO (Migration 008 logic repeated for safety)
CREATE TABLE IF NOT EXISTS public.fiscal_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  city VARCHAR(100) NOT NULL DEFAULT 'São Paulo',
  state VARCHAR(2) NOT NULL DEFAULT 'SP',
  address TEXT,
  zip_code VARCHAR(9),
  focus_nfe_token TEXT,
  focus_nfe_environment VARCHAR(20) DEFAULT 'sandbox',
  auto_issue_nfse BOOLEAN DEFAULT false,
  salao_parceiro_enabled BOOLEAN DEFAULT true,
  default_salon_percentage DECIMAL(5,2) DEFAULT 60.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.professional_fiscal_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL UNIQUE REFERENCES public.providers(id) ON DELETE CASCADE,
  cnpj VARCHAR(18) NOT NULL,
  municipal_registration VARCHAR(50),
  social_name VARCHAR(255),
  fantasy_name VARCHAR(255),
  service_percentage DECIMAL(5,2) DEFAULT 40.00,
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(9),
  email VARCHAR(255),
  phone VARCHAR(20),
  active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.nfse_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES public.providers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  reference VARCHAR(100) UNIQUE,
  nfse_number VARCHAR(50),
  verification_code VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  total_value DECIMAL(10,2) NOT NULL,
  salon_value DECIMAL(10,2) NOT NULL,
  professional_value DECIMAL(10,2) NOT NULL,
  professional_cnpj VARCHAR(18) NOT NULL,
  service_description TEXT NOT NULL,
  focus_response JSONB,
  xml_url TEXT,
  pdf_url TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. COMPLAINTS (Reclamações)
CREATE TABLE IF NOT EXISTS public.complaints (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id),
    date DATE NOT NULL,
    subject TEXT,
    description TEXT,
    status TEXT CHECK (status IN ('Pendente', 'Em Análise', 'Resolvido')),
    resolution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. PANTRY LOGS
CREATE TABLE IF NOT EXISTS public.pantry_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    time TIME,
    item_id UUID REFERENCES public.pantry_items(id),
    quantity INTEGER NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    provider_id UUID REFERENCES public.providers(id),
    appointment_id UUID REFERENCES public.appointments(id),
    cost_at_moment NUMERIC(10,2),
    reference_at_moment NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. USAGE LOGS
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    stock_item_id UUID REFERENCES public.stock_items(id),
    quantity INTEGER NOT NULL,
    type TEXT CHECK (type IN ('VENDA', 'USO_INTERNO', 'PERDA', 'AJUSTE_ENTRADA', 'CORRECAO')),
    provider_id UUID REFERENCES public.providers(id),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- End of Synchronization Script
