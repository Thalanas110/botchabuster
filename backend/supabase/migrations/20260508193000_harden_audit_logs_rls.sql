-- Restrict audit log table access to service-role backend operations.
-- This keeps public/authenticated clients from writing directly.

REVOKE ALL ON TABLE public.audit_logs FROM anon;
REVOKE ALL ON TABLE public.audit_logs FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.audit_logs TO service_role;

DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service role can read audit logs" ON public.audit_logs;

CREATE POLICY "Service role can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read audit logs"
  ON public.audit_logs
  FOR SELECT
  TO service_role
  USING (true);
