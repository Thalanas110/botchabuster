ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS inspector_code TEXT;

UPDATE public.profiles AS p
SET inspector_code = u.raw_user_meta_data ->> 'access_code'
FROM auth.users AS u
WHERE u.id = p.id
  AND p.inspector_code IS NULL
  AND (u.raw_user_meta_data ->> 'access_code') IS NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, inspector_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'access_code'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  RETURN NEW;
END;
$$;
