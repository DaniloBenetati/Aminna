-- CRM Overhaul Migration
-- This migration implements the structure for a professional CRM integrated with Meta API.

-- 1. Funnel Status (Configurable stages)
CREATE TABLE IF NOT EXISTS public.crm_funnel_stages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    "order" INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed initial stages
INSERT INTO public.crm_funnel_stages (name, color, "order")
VALUES 
    ('Novo', '#3b82f6', 1),
    ('Em Atendimento', '#6366f1', 2),
    ('Aguardando Resposta', '#f59e0b', 3),
    ('Qualificado', '#a855f7', 4),
    ('Proposta Enviada', '#ec4899', 5),
    ('Fechado (Ganho)', '#10b981', 6),
    ('Perdido', '#64748b', 7)
ON CONFLICT DO NOTHING;

-- 2. CRM Tags
CREATE TABLE IF NOT EXISTS public.crm_tags (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#94a3b8',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. CRM Attendants (Linking to profiles)
CREATE TABLE IF NOT EXISTS public.crm_attendants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT CHECK (status IN ('online', 'offline', 'busy')) DEFAULT 'offline',
    last_seen TIMESTAMP WITH TIME ZONE,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CRM Conversations
CREATE TABLE IF NOT EXISTS public.crm_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    meta_conversation_id TEXT UNIQUE,
    platform TEXT CHECK (platform IN ('whatsapp', 'instagram', 'messenger')) DEFAULT 'whatsapp',
    status_id UUID REFERENCES public.crm_funnel_stages(id),
    current_attendant_id UUID REFERENCES public.crm_attendants(id),
    last_message_preview TEXT,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    unread_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. CRM Messages
CREATE TABLE IF NOT EXISTS public.crm_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
    meta_message_id TEXT UNIQUE,
    sender_type TEXT CHECK (sender_type IN ('customer', 'attendant', 'system', 'ai')) NOT NULL,
    sender_id UUID, -- Can be customer_id, attendant_id, or null for system/ai
    content TEXT,
    message_type TEXT DEFAULT 'text', -- text, image, audio, video, document, template
    media_url TEXT,
    status TEXT DEFAULT 'sent', -- sent, delivered, read, failed
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. CRM Conversation Tags Relationship
CREATE TABLE IF NOT EXISTS public.crm_conversation_tags (
    conversation_id UUID REFERENCES public.crm_conversations(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.crm_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, tag_id)
);

-- 7. CRM Automations
CREATE TABLE IF NOT EXISTS public.crm_automations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    trigger_type TEXT NOT NULL, -- message_received, status_changed, inactivity_timeout
    conditions JSONB DEFAULT '[]'::jsonb,
    actions JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Webhook Logs (For debugging Meta API)
CREATE TABLE IF NOT EXISTS public.crm_webhook_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    payload JSONB,
    processed BOOLEAN DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Add Meta ID to Customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS meta_id TEXT UNIQUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_crm_interaction_at TIMESTAMP WITH TIME ZONE;

-- RLS Policies (Basic enable)
ALTER TABLE public.crm_funnel_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_attendants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_conversation_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for now (assuming app handling)
-- In production, these should be restricted to authenticated users or specific roles.
CREATE POLICY "Allow all for authenticated" ON public.crm_funnel_stages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.crm_tags FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.crm_attendants FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.crm_conversations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.crm_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.crm_conversation_tags FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.crm_automations FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.crm_webhook_logs FOR ALL TO authenticated USING (true);
