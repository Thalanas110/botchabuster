CREATE TABLE public.market_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX market_locations_name_key
  ON public.market_locations (lower(name));

ALTER TABLE public.market_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view market locations"
  ON public.market_locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage market locations"
  ON public.market_locations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.market_locations (name)
VALUES
  ('Old Market'),
  ('New Market'),
  ('Pag-asa Market'),
  ('Baretto Talipapa'),
  ('Old Cabalan Talipapa'),
  ('New Cabalan Talipapa')
ON CONFLICT DO NOTHING;
