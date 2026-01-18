-- Add 'hold' status to part_exchanges constraint
ALTER TABLE part_exchanges DROP CONSTRAINT IF EXISTS part_exchanges_status_check;
ALTER TABLE part_exchanges ADD CONSTRAINT part_exchanges_status_check 
  CHECK (status IN ('pending', 'linked', 'hold'));

-- Add hold_reason column
ALTER TABLE part_exchanges ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE part_exchanges ADD COLUMN IF NOT EXISTS hold_at TIMESTAMPTZ;
ALTER TABLE part_exchanges ADD COLUMN IF NOT EXISTS hold_by UUID REFERENCES auth.users(id);