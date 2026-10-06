-- Cloud integration checks; fixtures, requests and all attendance edits roll back.
BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES
 ('11111111-1111-4111-8111-111111111111','attendance-qa-1@example.invalid','{}','{}'),
 ('22222222-2222-4222-8222-222222222222','attendance-qa-2@example.invalid','{}','{}');
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE t timestamptz:=clock_timestamp()-interval '10 minutes'; d date:=(t AT TIME ZONE 'Asia/Tehran')::date; r uuid;
BEGIN
 PERFORM public.register_attendance(t,'start','office');
 IF (SELECT count(*) FROM public.portal_work_days)<>1 THEN RAISE EXCEPTION 'owner read'; END IF;
 BEGIN PERFORM public.register_attendance(clock_timestamp()+interval '5 minutes','start','office'); RAISE EXCEPTION 'future accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='future accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM public.register_attendance(clock_timestamp()-interval '16 minutes','start','office'); RAISE EXCEPTION 'stale accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='stale accepted' THEN RAISE; END IF; END;
 BEGIN UPDATE public.portal_work_days SET sessions='[]'; RAISE EXCEPTION 'direct edit allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.portal_work_days(user_id,work_date) VALUES(auth.uid(),d+1); RAISE EXCEPTION 'direct insert allowed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 r:=public.request_attendance(d,'time','start','office',t-interval '1 hour',0,'توضیح آزمون اصلاح ساعت');
 IF (SELECT (sessions->0->>'start')::timestamptz FROM public.portal_work_days)<>t THEN RAISE EXCEPTION 'pending changed clock'; END IF;
 BEGIN PERFORM public.review_attendance(r,'approved',''); RAISE EXCEPTION 'employee approval'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.portal_time_requests SET status='approved'; RAISE EXCEPTION 'direct approval'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.request_attendance(d,'time','start','office',t-interval '1 hour',0,'درخواست تکراری آزمون'); RAISE EXCEPTION 'duplicate accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='duplicate accepted' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.portal_work_days)<>0 OR (SELECT count(*) FROM public.portal_time_requests)<>0 THEN RAISE EXCEPTION 'cross-user leak'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r uuid; before_time timestamptz; BEGIN
 IF public.portal_access()<>'super_admin' THEN RAISE EXCEPTION 'admin missing'; END IF;
 SELECT id INTO r FROM public.portal_time_requests WHERE user_id='11111111-1111-4111-8111-111111111111';
 SELECT (sessions->0->>'start')::timestamptz INTO before_time FROM public.portal_work_days WHERE user_id='11111111-1111-4111-8111-111111111111';
 PERFORM public.review_attendance(r,'approved','تأیید آزمایشی');
 IF (SELECT (sessions->0->>'start')::timestamptz FROM public.portal_work_days WHERE user_id='11111111-1111-4111-8111-111111111111')<>before_time-interval '1 hour' THEN RAISE EXCEPTION 'approval not applied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.portal_time_requests WHERE id=r AND status='approved' AND reviewer_id=auth.uid() AND reviewed_at IS NOT NULL) THEN RAISE EXCEPTION 'audit missing'; END IF;
 BEGIN PERFORM public.review_attendance(r,'approved',''); RAISE EXCEPTION 'double approval'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='double approval' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE d date; r uuid; BEGIN
 SELECT work_date INTO d FROM public.portal_work_days;
 r:=public.request_attendance(d,'time','end','office',clock_timestamp()-interval '5 minutes',NULL,'توضیح آزمون خروج');
 PERFORM public.register_attendance(clock_timestamp()-interval '4 minutes','start','mission');
 PERFORM public.request_attendance(d,'late',NULL,NULL,NULL,NULL,'توضیح آزمون دیر رسیدن');
 BEGIN PERFORM public.register_attendance(clock_timestamp()-interval '3 minutes','end','office'); RAISE EXCEPTION 'mission bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='mission bypass' THEN RAISE; END IF; END;
 PERFORM public.register_attendance(clock_timestamp()-interval '2 minutes','end','mission');
 PERFORM public.register_attendance(clock_timestamp()-interval '1 minute','end','office');
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r uuid; before_data jsonb; BEGIN
 SELECT id INTO r FROM public.portal_time_requests WHERE user_id='11111111-1111-4111-8111-111111111111' AND kind='time' AND status='pending';
 BEGIN PERFORM public.review_attendance(r,'approved',''); RAISE EXCEPTION 'stale approval'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='stale approval' THEN RAISE; END IF; END;
 SELECT sessions INTO before_data FROM public.portal_work_days WHERE user_id='11111111-1111-4111-8111-111111111111';
 PERFORM public.review_attendance(r,'rejected','تردد تغییر کرده است');
 IF (SELECT sessions FROM public.portal_work_days WHERE user_id='11111111-1111-4111-8111-111111111111')<>before_data THEN RAISE EXCEPTION 'rejection changed clocks'; END IF;
 SELECT id INTO r FROM public.portal_time_requests WHERE user_id='11111111-1111-4111-8111-111111111111' AND kind='late';
 PERFORM public.review_attendance(r,'approved','توضیح پذیرفته شد');
 IF (SELECT sessions FROM public.portal_work_days WHERE user_id='11111111-1111-4111-8111-111111111111')<>before_data THEN RAISE EXCEPTION 'late explanation changed clock'; END IF;
END $$;
RESET ROLE;
-- HR role cannot review or see another employee's data.
UPDATE auth.users SET raw_app_meta_data='{"portal_role":"hr_admin"}' WHERE id='22222222-2222-4222-8222-222222222222';
SELECT set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF (SELECT count(*) FROM public.portal_work_days)<>0 THEN RAISE EXCEPTION 'HR attendance leak'; END IF;
 BEGIN PERFORM public.review_attendance(gen_random_uuid(),'approved',''); RAISE EXCEPTION 'HR review'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.register_attendance(now(),'start','office'); RAISE EXCEPTION 'anon registration'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM * FROM public.portal_work_days; RAISE EXCEPTION 'anon read'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
SELECT 'PASS: 15-minute limit, future rejection, isolation, restricted writes, pending, approval, audit, duplicate, stale request, mission, rejection, late explanation and anonymous/HR boundaries' AS result;
