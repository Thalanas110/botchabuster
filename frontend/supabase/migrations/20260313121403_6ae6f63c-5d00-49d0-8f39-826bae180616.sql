
-- Access codes table for inspector registration validation
CREATE TABLE public.access_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  max_uses integer DEFAULT NULL,
  times_used integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz DEFAULT NULL
);

ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage access codes
CREATE POLICY "Admins can manage access codes"
  ON public.access_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Function to validate and consume an access code (callable by anyone during signup)
CREATE OR REPLACE FUNCTION public.validate_access_code(_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_row access_codes%ROWTYPE;
BEGIN
  SELECT * INTO code_row FROM access_codes
  WHERE code = _code AND is_active = true;

  IF NOT FOUND THEN RETURN false; END IF;
  IF code_row.expires_at IS NOT NULL AND code_row.expires_at < now() THEN RETURN false; END IF;
  IF code_row.max_uses IS NOT NULL AND code_row.times_used >= code_row.max_uses THEN RETURN false; END IF;

  UPDATE access_codes SET times_used = times_used + 1 WHERE id = code_row.id;
  RETURN true;
END;
$$;
