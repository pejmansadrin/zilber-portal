BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES
('33333333-3333-4333-8333-333333333333','pending-exit-qa@example.invalid','{}','{}'),
('44444444-4444-4444-8444-444444444444','pending-exit-other@example.invalid','{}','{}');
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r uuid; t timestamptz:=clock_timestamp(); BEGIN
 r:=public.request_attendance((t AT TIME ZONE 'Asia/Tehran')::date,'time','start','office',t-interval '30 minutes',NULL,'ورود دیر ثبت شده برای آزمون');
 BEGIN PERFORM public.close_pending_attendance(r,t-interval '40 minutes',true); RAISE EXCEPTION 'TEST: reverse exit accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
 BEGIN PERFORM public.close_pending_attendance(r,t+interval '16 minutes',false); RAISE EXCEPTION 'TEST: future exit accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
 BEGIN PERFORM public.close_pending_attendance(r,t-interval '20 minutes',false); RAISE EXCEPTION 'TEST: unacknowledged exit accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
 PERFORM public.close_pending_attendance(r,t,false);
 IF NOT EXISTS(SELECT 1 FROM public.portal_time_requests WHERE id=r AND requested_until=t AND status='pending') THEN RAISE EXCEPTION 'TEST: exit not stored'; END IF;
 IF EXISTS(SELECT 1 FROM public.portal_work_days WHERE user_id=auth.uid()) THEN RAISE EXCEPTION 'TEST: pending work credited'; END IF;
 BEGIN PERFORM public.close_pending_attendance(r,t+interval '1 minute',false); RAISE EXCEPTION 'TEST: duplicate accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
SELECT set_config('test.pending_request_id',(SELECT id::text FROM public.portal_time_requests WHERE user_id='33333333-3333-4333-8333-333333333333'),true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.close_pending_attendance(current_setting('test.pending_request_id')::uuid,clock_timestamp(),false); RAISE EXCEPTION 'TEST: other owner accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
 IF has_function_privilege('anon','public.close_pending_attendance(uuid,timestamptz,boolean)','execute') THEN RAISE EXCEPTION 'TEST: anonymous access'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r uuid; BEGIN
 SELECT id INTO r FROM public.portal_time_requests WHERE user_id='33333333-3333-4333-8333-333333333333';
 PERFORM public.review_attendance(r,'approved','تأیید بازه کامل');
 IF NOT EXISTS(SELECT 1 FROM public.portal_work_days d JOIN public.portal_time_requests q ON q.user_id=d.user_id AND q.work_date=d.work_date WHERE q.id=r AND (d.sessions->0->>'end')::timestamptz=q.requested_until) THEN RAISE EXCEPTION 'TEST: approval lost exit'; END IF;
END $$;
RESET ROLE;
-- Test the approval-before-exit race and rejection without persisting fixtures.
DELETE FROM public.portal_work_days WHERE user_id='33333333-3333-4333-8333-333333333333';
DELETE FROM public.portal_time_requests WHERE user_id='33333333-3333-4333-8333-333333333333';
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
SELECT public.request_attendance((clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date,'time','start','remote',clock_timestamp()-interval '30 minutes',NULL,'آزمون تأیید همزمان مدیر');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
SELECT public.review_attendance((SELECT id FROM public.portal_time_requests WHERE user_id='33333333-3333-4333-8333-333333333333'),'approved','');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
SELECT public.close_pending_attendance((SELECT id FROM public.portal_time_requests WHERE user_id=auth.uid()),clock_timestamp(),false);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.portal_work_days WHERE user_id=auth.uid() AND sessions->0->>'end' IS NULL) THEN RAISE EXCEPTION 'TEST: approved race left open'; END IF; END $$;
RESET ROLE;
DELETE FROM public.portal_work_days WHERE user_id='33333333-3333-4333-8333-333333333333';
UPDATE public.portal_time_requests SET status='rejected',requested_until=NULL WHERE user_id='33333333-3333-4333-8333-333333333333';
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN PERFORM public.close_pending_attendance((SELECT id FROM public.portal_time_requests WHERE user_id=auth.uid()),clock_timestamp(),false); RAISE EXCEPTION 'TEST: rejected accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'TEST:%' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
ROLLBACK;
