-- Run against the connected cloud directory; all fixture edits roll back.
BEGIN;
UPDATE public.employees SET manager_id=3 WHERE id=4;
SELECT set_config('request.jwt.claim.sub','32983988-263e-4e91-a8cc-f9a4eaf9be40',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.portal_access()<>'manager' THEN RAISE EXCEPTION 'Manager role missing'; END IF;
 IF jsonb_array_length(public.organization_directory())<>1 THEN RAISE EXCEPTION 'Manager directory leak'; END IF;
 IF (SELECT count(*) FROM public.employees)<>1 THEN RAISE EXCEPTION 'Personal directory leak'; END IF;
 PERFORM public.save_organization(4,'employees',null,'{"team":"QA rollback"}');
 BEGIN PERFORM public.save_organization(4,'employees',null,'{"department":"forbidden"}'); RAISE EXCEPTION 'Manager field escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.organization_records(4,'employee_compensation');
 PERFORM public.save_organization(4,'employees',null,'{"preferred_name":"QA rollback"}');
 PERFORM public.save_organization(4,'employee_languages',null,'{"language":"QA rollback"}');
 PERFORM public.organization_records(4,'employee_bank_accounts'); RAISE EXCEPTION 'Manager salary leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_organization(5,'employees',null,'{"team":"forbidden"}'); RAISE EXCEPTION 'Cross-team edit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','b91bf984-00bd-4507-ad80-fb4a7366ca55',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.portal_access()<>'employee' THEN RAISE EXCEPTION 'Employee role invalid'; END IF;
 IF jsonb_array_length(public.organization_directory())<>0 THEN RAISE EXCEPTION 'Employee directory leak'; END IF;
 UPDATE public.employees SET preferred_name='QA rollback' WHERE id=4;
 BEGIN PERFORM public.save_organization(4,'employees',null,'{"team":"forbidden"}'); RAISE EXCEPTION 'Employee organization edit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.employees SET manager_id=4 WHERE id=4; RAISE EXCEPTION 'Self-assigned manager'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.employees SET auth_user_id='32983988-263e-4e91-a8cc-f9a4eaf9be40' WHERE id=4; RAISE EXCEPTION 'Owner escalation'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE auth.users SET raw_app_meta_data=raw_app_meta_data || '{"portal_role":"hr_admin"}'::jsonb WHERE id='b91bf984-00bd-4507-ad80-fb4a7366ca55';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.portal_access()<>'hr_admin' THEN RAISE EXCEPTION 'HR role missing'; END IF;
 PERFORM public.save_organization(4,'employee_compensation',null,'{"base_amount":100,"currency":"IRR"}');
 BEGIN PERFORM public.save_organization(4,'employees',null,'{"national_id":"forbidden"}'); RAISE EXCEPTION 'HR personal edit'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.organization_records(4,'employee_bank_accounts'); RAISE EXCEPTION 'HR personal bank leak'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF public.portal_access()<>'super_admin' THEN RAISE EXCEPTION 'Super-admin missing'; END IF;
 IF jsonb_array_length(public.organization_directory())<>7 THEN RAISE EXCEPTION 'Incomplete super-admin directory'; END IF;
 IF (SELECT count(*) FROM public.employees)<>7 THEN RAISE EXCEPTION 'Super-admin RLS denied'; END IF;
 PERFORM public.save_organization(4,'employees',null,'{"department":"QA rollback"}');
 PERFORM public.save_organization(4,'employee_compensation',null,'{"base_amount":100,"currency":"IRR"}');
 PERFORM public.organization_records(4,'employee_compensation');
 PERFORM public.save_organization(4,'employees',null,'{"preferred_name":"QA rollback"}');
 PERFORM public.save_organization(4,'employee_languages',null,'{"language":"QA rollback"}');
 PERFORM public.organization_records(4,'employee_bank_accounts');
 BEGIN PERFORM public.save_organization(4,'employees',null,'{"auth_user_id":null}'); RAISE EXCEPTION 'Owner must remain protected'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.save_organization(4,'employee_compensation',99999999,'{"base_amount":100}'); RAISE EXCEPTION 'Missing record accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.organization_directory(); RAISE EXCEPTION 'Anonymous access'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: owner, manager, super-admin, anonymous, field and scope boundaries' AS result;
