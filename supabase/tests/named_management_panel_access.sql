BEGIN;
SELECT set_config('request.jwt.claim.sub','85eb9126-6465-4b72-b74b-93fdffe073a1',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.portal_access()<>'super_admin' THEN RAISE EXCEPTION 'Narges panel access missing'; END IF;
 IF jsonb_array_length(public.organization_directory())<>(SELECT count(*) FROM public.employees) THEN RAISE EXCEPTION 'Narges directory incomplete'; END IF;
END $$;
RESET ROLE;
-- Trusted role metadata alone cannot expand the two-account super-admin list.
UPDATE auth.users SET raw_app_meta_data=raw_app_meta_data || '{"portal_role":"super_admin","is_super_admin":true}'::jsonb WHERE id='32983988-263e-4e91-a8cc-f9a4eaf9be40';
SELECT set_config('request.jwt.claim.sub','32983988-263e-4e91-a8cc-f9a4eaf9be40',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.portal_access()='super_admin' THEN RAISE EXCEPTION 'Unauthorized super-admin role'; END IF;
 IF (SELECT count(*) FROM public.employees)<>1 THEN RAISE EXCEPTION 'Unauthorized global read'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: named super-admin accounts and denied third-account elevation' AS result;
