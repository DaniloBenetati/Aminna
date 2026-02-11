-- Migration to fix Agenda and Professionals save errors
-- Adds missing columns for end time and custom professional durations

-- 1. Add end_time to appointments table
ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS end_time TEXT;

-- 2. Add custom_durations to providers table
ALTER TABLE providers 
ADD COLUMN IF NOT EXISTS custom_durations JSONB DEFAULT '{}';

-- Comments
COMMENT ON COLUMN appointments.end_time IS 'Stored end time of the appointment/service';
COMMENT ON COLUMN providers.custom_durations IS 'JSON storage for professional-specific service durations (serviceId -> minutes)';
