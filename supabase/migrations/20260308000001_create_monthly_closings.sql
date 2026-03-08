-- Create monthly_closings table
CREATE TABLE IF NOT EXISTS public.monthly_closings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    year INTEGER NOT NULL,
    month INTEGER NOT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    project_id UUID REFERENCES public.financial_config(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(year, month)
);

-- Enable RLS
ALTER TABLE public.monthly_closings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON public.monthly_closings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.monthly_closings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.monthly_closings FOR UPDATE USING (true) WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER set_monthly_closings_updated_at
    BEFORE UPDATE ON public.monthly_closings
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
