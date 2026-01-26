-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Auth)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'manager', 'staff')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. PROVIDERS (Profissionais)
CREATE TABLE public.providers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT,
    specialties TEXT[], -- Array of strings
    commission_rate NUMERIC(3,2) DEFAULT 0.00,
    avatar TEXT,
    phone TEXT,
    birth_date DATE,
    pix_key TEXT,
    active BOOLEAN DEFAULT true,
    work_days INTEGER[], -- Array of integers (0-6)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CUSTOMERS (Clientes)
CREATE TABLE public.customers (
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
    assigned_provider_id UUID REFERENCES public.providers(id),
    restricted_provider_ids UUID[], -- Array of UUIDs
    preferences JSONB DEFAULT '{}'::jsonb,
    observations TEXT,
    acquisition_channel TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. SERVICES (Catálogo)
CREATE TABLE public.services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    required_specialty TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. STOCK ITEMS (Estoque)
CREATE TABLE public.stock_items (
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
    sale_price NUMERIC(10,2), -- Only for 'Venda'
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. PANTRY ITEMS (Copa)
CREATE TABLE public.pantry_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT,
    category TEXT CHECK (category IN ('Bebida', 'Alimento', 'Outro')),
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 10,
    cost_price NUMERIC(10,2) DEFAULT 0.00,
    reference_price NUMERIC(10,2) DEFAULT 0.00, -- For reporting
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. PARTNERS (Parceiros)
CREATE TABLE public.partners (
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
CREATE TABLE public.leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    source TEXT,
    status TEXT CHECK (status IN ('NOVO', 'ATENDIMENTO', 'QUALIFICADO', 'PROPOSTA', 'CONVERTIDO', 'PERDIDO')),
    notes TEXT,
    lost_reason TEXT,
    estimated_value NUMERIC(10,2),
    service_interest TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. CAMPAIGNS (Marketing)
CREATE TABLE public.campaigns (
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
CREATE TABLE public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id),
    provider_id UUID REFERENCES public.providers(id),
    service_id UUID REFERENCES public.services(id),
    date DATE NOT NULL,
    time TIME NOT NULL,
    status TEXT CHECK (status IN ('Confirmado', 'Pendente', 'Concluído', 'Cancelado', 'Em Andamento')),
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Financials
    price_paid NUMERIC(10,2),
    booked_price NUMERIC(10,2), -- Price at booking time
    commission_rate_snapshot NUMERIC(3,2), -- Snapshot
    
    -- Details
    is_courtesy BOOLEAN DEFAULT false,
    applied_coupon TEXT,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    payment_method TEXT,
    
    combined_service_names TEXT, -- Cache for display
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. APPOINTMENT SERVICES (Multi-service support)
CREATE TABLE public.appointment_services (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id),
    provider_id UUID REFERENCES public.providers(id),
    
    price NUMERIC(10,2) NOT NULL,
    commission_rate_snapshot NUMERIC(3,2),
    
    is_courtesy BOOLEAN DEFAULT false,
    discount_amount NUMERIC(10,2) DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 12. SALES (POS)
CREATE TABLE public.sales (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    customer_id UUID REFERENCES public.customers(id),
    total_price NUMERIC(10,2) NOT NULL,
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. SALE ITEMS (Itens da Venda)
CREATE TABLE public.sale_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.stock_items(id),
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 14. USAGE LOGS (Consumo Interno - Profissionais)
CREATE TABLE public.usage_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    stock_item_id UUID REFERENCES public.stock_items(id),
    quantity INTEGER NOT NULL,
    type TEXT CHECK (type IN ('VENDA', 'USO_INTERNO', 'PERDA', 'AJUSTE_ENTRADA', 'CORRECAO')),
    provider_id UUID REFERENCES public.providers(id),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 15. PANTRY LOGS (Consumo Copa)
CREATE TABLE public.pantry_logs (
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

-- 16. FINANCIAL TRANSACTIONS (Fluxo de Caixa)
CREATE TABLE public.financial_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    date DATE NOT NULL,
    type TEXT CHECK (type IN ('RECEITA', 'DESPESA')),
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10,2) NOT NULL,
    status TEXT CHECK (status IN ('Pago', 'Pendente', 'Previsto', 'Atrasado')),
    payment_method TEXT,
    origin TEXT CHECK (origin IN ('Serviço', 'Produto', 'Despesa', 'Outro')),
    related_id UUID, -- Polymorphic ID (Appointment, Sale, etc)
    customer_or_provider_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. COMMISSION HISTORY (Histórico de Taxas)
CREATE TABLE public.commission_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    provider_id UUID REFERENCES public.providers(id),
    date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    old_rate NUMERIC(3,2),
    new_rate NUMERIC(3,2),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
