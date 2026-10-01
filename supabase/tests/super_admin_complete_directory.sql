BEGIN;
-- Fixtures are restored by ROLLBACK; no real profile changes persist.
UPDATE public.employees SET archived_at=now(), manager_id=3 WHERE id=4;
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE area text; expected bigint; actual bigint; BEGIN
 IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.organization_directory()) e WHERE (e->>'id')::bigint=4 AND e->>'archived_at' IS NOT NULL) THEN RAISE EXCEPTION 'Archived employee missing'; END IF;
 IF jsonb_array_length(public.organization_directory())<>(SELECT count(*) FROM public.employees) THEN RAISE EXCEPTION 'Incomplete directory'; END IF;
 FOR area IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'employee\_%' ESCAPE '\' LOOP
   EXECUTE format('SELECT count(*) FROM public.%I WHERE employee_id=4',area) INTO expected;
   actual:=jsonb_array_length(public.organization_records(4,area));
   IF actual<>expected THEN RAISE EXCEPTION 'Incomplete records: %',area; END IF;
 END LOOP;
 PERFORM public.save_organization(4,'employees',null,'{"team":"QA archived access"}');
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','32983988-263e-4e91-a8cc-f9a4eaf9be40',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(public.organization_directory()) e WHERE (e->>'id')::bigint=4) THEN RAISE EXCEPTION 'Manager archive leak'; END IF;
 BEGIN PERFORM public.organization_records(4,'employee_reviews'); RAISE EXCEPTION 'Manager archived records leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE auth.users SET raw_app_meta_data=raw_app_meta_data || '{"portal_role":"hr_admin"}'::jsonb WHERE id='b91bf984-00bd-4507-ad80-fb4a7366ca55';
SELECT set_config('request.jwt.claim.sub','b91bf984-00bd-4507-ad80-fb4a7366ca55',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(public.organization_directory()) e WHERE (e->>'id')::bigint=4) THEN RAISE EXCEPTION 'HR archive leak'; END IF;
 BEGIN PERFORM public.organization_records(4,'employee_contracts'); RAISE EXCEPTION 'HR archived records leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: complete super-admin directory and related records, archived access, restricted HR and manager' AS result;
