-- Add recurrence_id column to appointments table
-- This column is used to group recurring appointments together

ALTER TABLE appointments 
ADD COLUMN IF NOT EXISTS recurrence_id TEXT;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_recurrence_id 
ON appointments(recurrence_id);

-- Add comment to document the column
COMMENT ON COLUMN appointments.recurrence_id IS 'Groups recurring appointments together. All appointments in the same recurrence series share the same recurrence_id.';
