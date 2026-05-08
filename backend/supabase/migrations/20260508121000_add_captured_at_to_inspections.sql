ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS captured_at TIMESTAMPTZ;

UPDATE public.inspections
SET captured_at = created_at
WHERE captured_at IS NULL;

ALTER TABLE public.inspections
  ALTER COLUMN captured_at SET DEFAULT now();

ALTER TABLE public.inspections
  ALTER COLUMN captured_at SET NOT NULL;
