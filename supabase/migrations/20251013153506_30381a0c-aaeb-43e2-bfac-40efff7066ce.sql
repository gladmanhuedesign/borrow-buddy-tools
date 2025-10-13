-- Add brand and power_source columns to tools table
ALTER TABLE tools
ADD COLUMN brand text,
ADD COLUMN power_source text CHECK (power_source IN ('battery', 'corded', 'gas', 'manual', 'pneumatic', 'hybrid'));