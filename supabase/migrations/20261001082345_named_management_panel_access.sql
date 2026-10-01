BEGIN;
-- Only the two explicitly authorized, existing Auth accounts can be super-admins.
CREATE OR REPLACE FUNCTION private.portal_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE WHEN u.id IN (
   'fd5162f3-916e-4294-9b96-b584ecea2888'::uuid,
   '85eb9126-6465-4b72-b74b-93fdffe073a1'::uuid
 ) AND u.raw_app_meta_data->>'portal_role' = 'super_admin' THEN 'super_admin'
 WHEN u.raw_app_meta_data->>'portal_role' = 'hr_admin' THEN 'hr_admin'
 WHEN EXISTS (SELECT 1 FROM public.employees e JOIN public.employees m ON e.manager_id=m.id
 WHERE m.auth_user_id=(select auth.uid()) AND m.archived_at IS NULL) THEN 'manager' ELSE 'employee' END
 FROM auth.users u WHERE u.id=(select auth.uid());
$$;
REVOKE ALL ON FUNCTION private.portal_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.portal_role() TO authenticated;
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"portal_role":"super_admin","is_super_admin":true}'::jsonb
WHERE (id='fd5162f3-916e-4294-9b96-b584ecea2888' AND email='pejmansadrinezhad@zilber.tech')
   OR (id='85eb9126-6465-4b72-b74b-93fdffe073a1' AND email='nargesnajaran@zilber.tech');
COMMIT;
