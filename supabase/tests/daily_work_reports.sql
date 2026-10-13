-- Run inside a transaction; caller rolls back fixture users and reports.
INSERT INTO auth.users(id,email) VALUES
 ('a7710000-0000-4000-8000-000000000001','work-report-owner@example.invalid'),
 ('a7710000-0000-4000-8000-000000000002','work-report-other@example.invalid');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','a7710000-0000-4000-8000-000000000001',true);
DO $$
DECLARE a jsonb; b jsonb; payload jsonb := '{"v":1,"period":"daily","fields":{"volume":"گزارش آزمایشی"},"lists":{"tasks":[{"text":"کار اول","time":"۲ ساعت"}],"problems":[{"text":"","time":""}],"futureTasks":[{"text":"برنامه فردا","time":""}]},"printEmptyRows":false}';
BEGIN
 a := public.open_daily_work_report(); b := public.open_daily_work_report();
 IF a->>'id' <> b->>'id' OR a->>'report_number' <> b->>'report_number' THEN RAISE EXCEPTION 'duplicate daily report'; END IF;
 IF (a->>'work_date')::date <> (now() AT TIME ZONE 'Asia/Tehran')::date THEN RAISE EXCEPTION 'wrong day'; END IF;
 IF a->>'username' <> 'work-report-owner@example.invalid' THEN RAISE EXCEPTION 'wrong identity'; END IF;
 b := public.save_daily_work_report((a->>'id')::uuid,0,payload);
 IF b->>'revision' <> '1' OR b->'content' <> payload OR b->>'saved_at' IS NULL THEN RAISE EXCEPTION 'save roundtrip failed'; END IF;
 BEGIN PERFORM public.save_daily_work_report((a->>'id')::uuid,0,payload); RAISE EXCEPTION 'stale revision allowed'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 BEGIN PERFORM public.save_daily_work_report((a->>'id')::uuid,1,jsonb_set(payload,'{fields,reporter}','"forged"')); RAISE EXCEPTION 'identity spoof allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 BEGIN PERFORM public.save_daily_work_report((a->>'id')::uuid,1,jsonb_set(payload,'{lists,tasks}','[]')); RAISE EXCEPTION 'invalid rows allowed'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub','a7710000-0000-4000-8000-000000000002',true);
 IF EXISTS(SELECT 1 FROM public.portal_work_reports WHERE id=(a->>'id')::uuid) THEN RAISE EXCEPTION 'other user can read report'; END IF;
 BEGIN PERFORM public.save_daily_work_report((a->>'id')::uuid,1,payload); RAISE EXCEPTION 'other user can update report'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 b := public.open_daily_work_report();
 IF a->>'report_number'=b->>'report_number' THEN RAISE EXCEPTION 'duplicate numbers'; END IF;
 IF has_table_privilege('authenticated','public.portal_work_reports','INSERT') OR has_table_privilege('authenticated','public.portal_work_reports','UPDATE') OR has_table_privilege('authenticated','public.portal_work_reports','DELETE') THEN RAISE EXCEPTION 'direct writes allowed'; END IF;
 PERFORM set_config('request.jwt.claim.sub','',true);
 BEGIN PERFORM public.open_daily_work_report(); RAISE EXCEPTION 'missing identity allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.open_daily_work_report(); RAISE EXCEPTION 'anonymous creation allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM 1 FROM public.portal_work_reports; RAISE EXCEPTION 'anonymous read allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
