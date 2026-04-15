ALTER TABLE public.inspections
ADD COLUMN client_submission_id UUID;

CREATE UNIQUE INDEX inspections_client_submission_id_key
  ON public.inspections (client_submission_id)
  WHERE client_submission_id IS NOT NULL;
