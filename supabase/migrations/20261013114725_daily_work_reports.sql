BEGIN;
CREATE TABLE public.portal_work_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  work_date date NOT NULL,
  report_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  reporter_name text NOT NULL,
  username text NOT NULL,
  department text NOT NULL DEFAULT '',
  template_version integer NOT NULL DEFAULT 1 CHECK (template_version = 1),
  content jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(content) = 'object'),
  revision integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  saved_at timestamptz,
  UNIQUE (user_id, work_date)
);
ALTER TABLE public.portal_work_reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_work_reports FROM anon, authenticated;
GRANT SELECT ON public.portal_work_reports TO authenticated;
CREATE POLICY work_reports_owner_read ON public.portal_work_reports
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE FUNCTION private.open_daily_work_report()
RETURNS public.portal_work_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner_id uuid := auth.uid(); day_date date := (now() AT TIME ZONE 'Asia/Tehran')::date;
  result public.portal_work_reports; display_name text; login_name text; dept text;
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('work-report:' || owner_id::text || ':' || day_date::text, 0));
  SELECT * INTO result FROM public.portal_work_reports WHERE user_id = owner_id AND work_date = day_date;
  IF FOUND THEN RETURN result; END IF;
  SELECT email INTO login_name FROM auth.users WHERE id = owner_id;
  SELECT full_name, department INTO display_name, dept FROM public.employees WHERE auth_user_id = owner_id LIMIT 1;
  INSERT INTO public.portal_work_reports(user_id, work_date, reporter_name, username, department)
  VALUES(owner_id, day_date, coalesce(nullif(display_name, ''), login_name, 'همکار زیلبر'),
         coalesce(login_name, ''), coalesce(dept, '')) RETURNING * INTO result;
  RETURN result;
END $$;

CREATE FUNCTION private.save_daily_work_report(report_id uuid, expected_revision integer, report_content jsonb)
RETURNS public.portal_work_reports
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner_id uuid := auth.uid(); result public.portal_work_reports; list_name text; item jsonb; pair record;
BEGIN
  IF owner_id IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE = '42501'; END IF;
  SELECT * INTO result FROM public.portal_work_reports WHERE id = report_id AND user_id = owner_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Report not found' USING ERRCODE = '42501'; END IF;
  IF expected_revision IS NULL OR result.revision <> expected_revision THEN
    RAISE EXCEPTION 'گزارش در صفحهٔ دیگری تغییر کرده است؛ ابتدا نسخهٔ جدید را باز کنید.' USING ERRCODE = '40001';
  END IF;
  IF report_content IS NULL OR jsonb_typeof(report_content) <> 'object' OR octet_length(report_content::text) > 300000
     OR report_content->>'v' IS DISTINCT FROM '1'
     OR (report_content->>'period') IS NULL OR report_content->>'period' NOT IN ('daily', 'weekly', 'monthly')
     OR jsonb_typeof(report_content->'fields') IS DISTINCT FROM 'object'
     OR jsonb_typeof(report_content->'lists') IS DISTINCT FROM 'object'
     OR jsonb_typeof(report_content->'printEmptyRows') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'ساختار گزارش نامعتبر است.' USING ERRCODE = '22023';
  END IF;
  FOR pair IN SELECT * FROM jsonb_each(report_content->'fields') LOOP
    IF pair.key NOT IN ('attach','recipient','dept','weekFrom','weekTo','month','year','volume')
       OR jsonb_typeof(pair.value) <> 'string' OR length(pair.value #>> '{}') > 10000 THEN
      RAISE EXCEPTION 'فیلد گزارش نامعتبر است.' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  FOREACH list_name IN ARRAY ARRAY['tasks','problems','futureTasks'] LOOP
    IF jsonb_typeof(report_content->'lists'->list_name) IS DISTINCT FROM 'array'
       OR jsonb_array_length(report_content->'lists'->list_name) NOT BETWEEN 1 AND 100 THEN
      RAISE EXCEPTION 'ردیف‌های گزارش نامعتبر است.' USING ERRCODE = '22023';
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(report_content->'lists'->list_name) LOOP
      IF jsonb_typeof(item) <> 'object' OR jsonb_typeof(item->'text') IS DISTINCT FROM 'string'
         OR jsonb_typeof(item->'time') IS DISTINCT FROM 'string'
         OR length(item->>'text') > 10000 OR length(item->>'time') > 200 THEN
        RAISE EXCEPTION 'متن ردیف گزارش نامعتبر است.' USING ERRCODE = '22023';
      END IF;
    END LOOP;
  END LOOP;
  UPDATE public.portal_work_reports SET content = report_content, revision = revision + 1,
    saved_at = now(), updated_at = now() WHERE id = result.id RETURNING * INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION private.open_daily_work_report(), private.save_daily_work_report(uuid,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.open_daily_work_report(), private.save_daily_work_report(uuid,integer,jsonb) TO authenticated;
CREATE FUNCTION public.open_daily_work_report() RETURNS jsonb
LANGUAGE sql SECURITY INVOKER SET search_path = '' AS $$ SELECT to_jsonb(private.open_daily_work_report()); $$;
CREATE FUNCTION public.save_daily_work_report(report_id uuid, expected_revision integer, report_content jsonb)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT to_jsonb(private.save_daily_work_report(report_id, expected_revision, report_content)); $$;
REVOKE ALL ON FUNCTION public.open_daily_work_report(), public.save_daily_work_report(uuid,integer,jsonb) FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION public.open_daily_work_report(), public.save_daily_work_report(uuid,integer,jsonb) TO authenticated;
COMMIT;
