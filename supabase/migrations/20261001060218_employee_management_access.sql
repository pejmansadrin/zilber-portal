-- Cloud employee directory only. All privileged lookups validate the current user.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE OR REPLACE FUNCTION private.portal_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT CASE WHEN u.raw_app_meta_data->>'portal_role' = 'super_admin' THEN 'super_admin'
 WHEN u.raw_app_meta_data->>'portal_role' = 'hr_admin' THEN 'hr_admin'
 WHEN EXISTS (SELECT 1 FROM public.employees e JOIN public.employees m ON e.manager_id=m.id
 WHERE m.auth_user_id=(select auth.uid()) AND m.archived_at IS NULL) THEN 'manager' ELSE 'employee' END
 FROM auth.users u WHERE u.id=(select auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.portal_access() RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT private.portal_role(); $$;
CREATE OR REPLACE FUNCTION private.can_manage_employee(target bigint, area text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT (select auth.uid()) IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.employees e WHERE e.id=target AND e.archived_at IS NULL AND (
 private.portal_role() IN ('super_admin','hr_admin') OR (
 area IN ('employees','employee_reviews','employee_training','employee_assets') AND
 e.manager_id IN (SELECT m.id FROM public.employees m WHERE m.auth_user_id=(select auth.uid()) AND m.archived_at IS NULL))));
$$;
CREATE INDEX IF NOT EXISTS employees_manager_access_idx ON public.employees(manager_id);
UPDATE auth.users SET raw_app_meta_data = raw_app_meta_data || '{"portal_role":"super_admin","is_super_admin":true}'::jsonb
WHERE id='fd5162f3-916e-4294-9b96-b584ecea2888' AND email='pejmansadrinezhad@zilber.tech';
DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND (tablename='employees' OR tablename LIKE 'employee\_%' ESCAPE '\') LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('CREATE POLICY portal_super_read ON public.%I FOR SELECT TO authenticated USING ((select private.portal_role()) = ''super_admin'')',t);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION private.organization_directory() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT coalesce(jsonb_agg((SELECT jsonb_object_agg(k,v) FROM jsonb_each(to_jsonb(e)) kv(k,v)
 WHERE private.portal_role()='super_admin' OR k = ANY(ARRAY['id','full_name','email','manager_id'] || ARRAY[
'employee_number','email','legal_entity','department','team','job_title','job_level','cost_center','work_location','work_arrangement','employment_type','employment_status','hired_on','original_hired_on','probation_ends_on','terminated_on','termination_reason','weekly_work_hours','manager_id']::text[])) ORDER BY e.full_name),'[]'::jsonb)
 FROM public.employees e WHERE private.can_manage_employee(e.id,'employees');
$$;
CREATE OR REPLACE FUNCTION public.organization_directory() RETURNS jsonb
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$ SELECT private.organization_directory(); $$;
CREATE OR REPLACE FUNCTION private.save_organization(target bigint, area text, record_id bigint, patch jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE allowed text[]; fields text; assignments text; found_id bigint;
BEGIN
 IF NOT private.can_manage_employee(target,area) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 CASE area
 WHEN 'employees' THEN allowed := ARRAY['employee_number','email','legal_entity','department','team','job_title','job_level','cost_center','work_location','work_arrangement','employment_type','employment_status','hired_on','original_hired_on','probation_ends_on','terminated_on','termination_reason','weekly_work_hours','manager_id'];
 WHEN 'employee_training' THEN allowed := ARRAY['title','provider','starts_on','completed_on','status','duration_hours','cost','currency','result','notes'];
 WHEN 'employee_contracts' THEN allowed := ARRAY['contract_number','contract_type','status','starts_on','ends_on','signed_on','job_title','department','work_location','weekly_work_hours','notice_period_days','notes'];
 WHEN 'employee_compensation' THEN allowed := ARRAY['effective_from','effective_to','base_amount','currency','pay_frequency','pay_basis','housing_allowance','transport_allowance','meal_allowance','bonus_details','overtime_details','notes'];
 WHEN 'employee_benefits' THEN allowed := ARRAY['benefit_type','provider','policy_number','starts_on','ends_on','employee_contribution','employer_contribution','currency','notes'];
 WHEN 'employee_assets' THEN allowed := ARRAY['asset_type','asset_tag','serial_number','description','assigned_on','returned_on','condition_at_assignment','condition_at_return','notes'];
 WHEN 'employee_reviews' THEN allowed := ARRAY['period_start','period_end','reviewed_on','rating','summary','goals'];
 WHEN 'employee_emergency_contacts' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['full_name','relationship','phone','alternate_phone','email','address','is_primary','notes'];
 WHEN 'employee_dependents' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['full_name','relationship','birth_date','national_id','insurance_covered','coverage_starts_on','coverage_ends_on','notes'];
 WHEN 'employee_bank_accounts' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['bank_name','branch_name','account_holder','account_number','iban','swift_code','currency','is_primary'];
 WHEN 'employee_education' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['institution','degree','field_of_study','country','starts_on','ends_on','grade','notes'];
 WHEN 'employee_work_history' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['employer','job_title','employment_type','location','starts_on','ends_on','responsibilities','reason_for_leaving','notes'];
 WHEN 'employee_skills' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['skill_name','category','proficiency','years_experience','assessed_on','notes'];
 WHEN 'employee_languages' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['language','speaking_level','reading_level','writing_level','listening_level','notes'];
 WHEN 'employee_certifications' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['title','issuer','credential_id','credential_url','issued_on','expires_on','notes'];
 WHEN 'employee_documents' THEN IF private.portal_role()<>'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF; allowed := ARRAY['title','document_type','issued_on','expires_on','notes'];
 ELSE RAISE EXCEPTION 'Unsupported area'; END CASE;
 IF area='employees' AND private.portal_role()='super_admin' THEN allowed:=allowed || ARRAY['first_name','last_name','preferred_name','full_name_latin','father_name','birth_date','birth_place','nationality','national_id','identity_document_number','identity_issue_place','gender','marital_status','military_service_status','passport_number','passport_expires_on','mobile_phone','personal_email','work_phone','phone_extension','country','province','city','postal_code','address_line_1','address_line_2','timezone','preferred_language','insurance_number','insurance_provider','tax_identifier','pension_number']; END IF;
 IF area='employees' AND private.portal_role()='manager' THEN
 allowed:=ARRAY['team','job_title','work_location','work_arrangement','weekly_work_hours']; END IF;
 IF jsonb_typeof(patch) <> 'object' OR patch='{}'::jsonb OR EXISTS (SELECT 1 FROM jsonb_object_keys(patch) k WHERE NOT k=ANY(allowed)) THEN
 RAISE EXCEPTION 'Protected or invalid field' USING ERRCODE='42501'; END IF;
 IF patch ? 'manager_id' AND (patch->>'manager_id')::bigint=target THEN RAISE EXCEPTION 'Employee cannot manage themselves'; END IF;
 IF area='employees' AND (patch ? 'first_name' OR patch ? 'last_name') THEN
 SELECT patch || jsonb_build_object('full_name',btrim(concat_ws(' ',coalesce(patch->>'first_name',e.first_name),coalesce(patch->>'last_name',e.last_name)))) INTO patch FROM public.employees e WHERE e.id=target;
 END IF;
 SELECT string_agg(format('%I',k),','),string_agg(format('%1$I = r.%1$I',k),',') INTO fields,assignments FROM jsonb_object_keys(patch) k;
 IF area='employees' THEN
 EXECUTE format('UPDATE public.employees e SET %s FROM jsonb_populate_record(NULL::public.employees,$1) r WHERE e.id=$2 RETURNING e.id',assignments) INTO found_id USING patch,target;
 ELSIF record_id IS NULL THEN
 EXECUTE format('INSERT INTO public.%1$I (employee_id,%2$s) SELECT $2,%2$s FROM jsonb_populate_record(NULL::public.%1$I,$1) RETURNING id',area,fields) INTO found_id USING patch,target;
 ELSE
 EXECUTE format('UPDATE public.%1$I e SET %2$s FROM jsonb_populate_record(NULL::public.%1$I,$1) r WHERE e.id=$2 AND e.employee_id=$3 RETURNING e.id',area,assignments) INTO found_id USING patch,record_id,target;
 END IF;
 IF found_id IS NULL THEN RAISE EXCEPTION 'Record unavailable' USING ERRCODE='42501'; END IF;
END $$;
CREATE OR REPLACE FUNCTION public.save_organization(target bigint, area text, record_id bigint, patch jsonb) RETURNS void
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.save_organization(target,area,record_id,patch); $$;
CREATE OR REPLACE FUNCTION private.organization_records(target bigint, area text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
 IF (private.portal_role()<>'super_admin' AND area NOT IN ('employee_contracts','employee_compensation','employee_benefits','employee_assets','employee_reviews','employee_training')) OR area NOT IN ('employee_training','employee_contracts','employee_compensation','employee_benefits','employee_assets','employee_reviews','employee_emergency_contacts','employee_dependents','employee_bank_accounts','employee_education','employee_work_history','employee_skills','employee_languages','employee_certifications','employee_documents') OR NOT private.can_manage_employee(target,area) THEN
 RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 EXECUTE format('SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY id),''[]''::jsonb) FROM public.%I r WHERE employee_id=$1',area) INTO result USING target;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.organization_records(target bigint, area text) RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT private.organization_records(target,area); $$;
REVOKE ALL ON FUNCTION private.portal_role(), private.can_manage_employee(bigint,text), private.organization_directory(), private.save_organization(bigint,text,bigint,jsonb), public.portal_access(), public.organization_directory(), public.save_organization(bigint,text,bigint,jsonb), public.organization_records(bigint,text), private.organization_records(bigint,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.portal_role(), private.can_manage_employee(bigint,text), private.organization_directory(), private.save_organization(bigint,text,bigint,jsonb), public.portal_access(), public.organization_directory(), public.save_organization(bigint,text,bigint,jsonb), public.organization_records(bigint,text), private.organization_records(bigint,text) TO authenticated;
CREATE POLICY portal_super_files_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id='employee-files' AND (select private.portal_role())='super_admin');
DO $$ BEGIN IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated; END IF; END $$;
COMMIT;
