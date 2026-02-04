-- Migration 008: Fiscal Integration for Focus NFe and Salão Parceiro (São Paulo)
-- This migration adds tables for fiscal configuration and NFSe tracking

-- 1. Fiscal Configuration Table (Salon settings)
CREATE TABLE IF NOT EXISTS fiscal_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NOT NULL UNIQUE,
  municipal_registration VARCHAR(50),
  state_registration VARCHAR(50),
  city VARCHAR(100) NOT NULL DEFAULT 'São Paulo',
  state VARCHAR(2) NOT NULL DEFAULT 'SP',
  address TEXT,
  zip_code VARCHAR(9),
  -- Focus NFe API Settings
  focus_nfe_token TEXT,
  focus_nfe_environment VARCHAR(20) DEFAULT 'sandbox', -- 'sandbox' or 'production'
  auto_issue_nfse BOOLEAN DEFAULT false,
  -- Salão Parceiro Settings
  salao_parceiro_enabled BOOLEAN DEFAULT true,
  default_salon_percentage DECIMAL(5,2) DEFAULT 60.00, -- Default salon commission % (60% salon, 40% professional)
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Professional Fiscal Configuration (CNPJ data for each professional)
CREATE TABLE IF NOT EXISTS professional_fiscal_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  cnpj VARCHAR(18) NOT NULL,
  municipal_registration VARCHAR(50),
  social_name VARCHAR(255), -- Razão Social
  fantasy_name VARCHAR(255), -- Nome Fantasia
  service_percentage DECIMAL(5,2) DEFAULT 40.00, -- Professional receives 40% by default
  -- Address (if different from salon)
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(9),
  -- Contact
  email VARCHAR(255),
  phone VARCHAR(20),
  -- Status
  active BOOLEAN DEFAULT true,
  verified BOOLEAN DEFAULT false, -- Admin verified this data
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider_id)
);

-- 3. NFSe Records (Track all issued NFSe)
CREATE TABLE IF NOT EXISTS nfse_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- References
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES providers(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  -- NFSe Data
  reference VARCHAR(100) UNIQUE, -- Focus NFe reference ID
  nfse_number VARCHAR(50), -- NFSe number after issued
  verification_code VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, issued, error, cancelled
  -- Values (Salão Parceiro segregation)
  total_value DECIMAL(10,2) NOT NULL,
  salon_value DECIMAL(10,2) NOT NULL,
  professional_value DECIMAL(10,2) NOT NULL,
  professional_cnpj VARCHAR(18) NOT NULL,
  -- Service Description
  service_description TEXT NOT NULL,
  -- Focus NFe Response
  focus_response JSONB,
  xml_url TEXT,
  pdf_url TEXT,
  -- Error Handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  -- Cancellation
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_reason TEXT,
  -- Metadata
  issued_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Add fiscal_config_id to providers table (optional link)
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS fiscal_config_id UUID REFERENCES professional_fiscal_config(id);

-- 5. Add nfse_record_id to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS nfse_record_id UUID REFERENCES nfse_records(id);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nfse_records_appointment ON nfse_records(appointment_id);
CREATE INDEX IF NOT EXISTS idx_nfse_records_provider ON nfse_records(provider_id);
CREATE INDEX IF NOT EXISTS idx_nfse_records_status ON nfse_records(status);
CREATE INDEX IF NOT EXISTS idx_nfse_records_reference ON nfse_records(reference);
CREATE INDEX IF NOT EXISTS idx_professional_fiscal_provider ON professional_fiscal_config(provider_id);

-- 7. Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_fiscal_config_updated_at BEFORE UPDATE ON fiscal_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_professional_fiscal_config_updated_at BEFORE UPDATE ON professional_fiscal_config
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfse_records_updated_at BEFORE UPDATE ON nfse_records
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Insert default fiscal config (user needs to update with real data)
INSERT INTO fiscal_config (
  salon_name,
  cnpj,
  city,
  state,
  salao_parceiro_enabled,
  default_salon_percentage,
  auto_issue_nfse
) VALUES (
  'Aminna - Atualizar Dados',
  '00.000.000/0000-00',
  'São Paulo',
  'SP',
  true,
  60.00,
  false
) ON CONFLICT (cnpj) DO NOTHING;

-- Comments
COMMENT ON TABLE fiscal_config IS 'Salon fiscal configuration for NFSe issuance';
COMMENT ON TABLE professional_fiscal_config IS 'Professional CNPJ data for Salão Parceiro compliance';
COMMENT ON TABLE nfse_records IS 'Track all issued NFSe via Focus NFe';
COMMENT ON COLUMN nfse_records.salon_value IS 'Salon portion (60%)';
COMMENT ON COLUMN nfse_records.professional_value IS 'Professional portion with CNPJ (40%)';
