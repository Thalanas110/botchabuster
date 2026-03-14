
CREATE TYPE public.freshness_classification AS ENUM ('fresh', 'acceptable', 'warning', 'spoiled');

CREATE TYPE public.meat_type AS ENUM ('pork', 'beef', 'chicken', 'fish', 'other');

CREATE TABLE public.inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  meat_type meat_type NOT NULL DEFAULT 'pork',
  classification freshness_classification NOT NULL,
  confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  lab_l NUMERIC(8,4),
  lab_a NUMERIC(8,4),
  lab_b NUMERIC(8,4),
  glcm_contrast NUMERIC(10,6),
  glcm_correlation NUMERIC(10,6),
  glcm_energy NUMERIC(10,6),
  glcm_homogeneity NUMERIC(10,6),
  flagged_deviations TEXT[] DEFAULT '{}',
  explanation TEXT,
  image_url TEXT,
  location TEXT,
  inspector_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inspections"
  ON public.inspections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inspections"
  ON public.inspections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inspections"
  ON public.inspections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inspections"
  ON public.inspections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public can view inspections for read access"
  ON public.inspections FOR SELECT
  TO anon
  USING (true);
