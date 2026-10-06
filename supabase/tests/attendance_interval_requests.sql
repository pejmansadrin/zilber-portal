BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data) VALUES
 ('33333333-3333-4333-8333-333333333333','attendance-interval-qa@example.invalid','{}','{}'),
 ('44444444-4444-4444-8444-444444444444','attendance-interval-other@example.invalid','{}','{}');
INSERT INTO public.portal_work_days(user_id,work_date,sessions,revision)
SELECT '33333333-3333-4333-8333-333333333333',d,
 jsonb_build_array(jsonb_build_object('start',(d::text||'T08:00:00+03:30')::timestamptz,'end',(d::text||'T17:00:00+03:30')::timestamptz,'mode','office')),1
FROM (SELECT (clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date-2 d) x;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE d date:=(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date-2; start_at timestamptz:=(d::text||'T10:00:00+03:30')::timestamptz; r uuid; BEGIN
 BEGIN PERFORM public.request_attendance_interval(d-1,'mission',start_at-interval '1 day',start_at-interval '1 day'+interval '1 hour','مأموریت بدون کار ثبت‌شده'); RAISE EXCEPTION 'missing work accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='missing work accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM public.request_attendance_interval(d,'mission',start_at-interval '3 hours',start_at,'مأموریت خارج از بازه کار'); RAISE EXCEPTION 'outside accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='outside accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM public.request_attendance_interval(d,'mission',start_at,start_at,'بازه بدون مدت معتبر'); RAISE EXCEPTION 'zero accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='zero accepted' THEN RAISE; END IF; END;
 BEGIN PERFORM public.request_attendance_interval(d,'mission',start_at,clock_timestamp()+interval '1 hour','پایان آینده نامعتبر است'); RAISE EXCEPTION 'future accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='future accepted' THEN RAISE; END IF; END;
 r:=public.request_attendance_interval(d,'mission',start_at,start_at+interval '2 hours','مأموریت داخل کار بسته‌شده');
 IF (SELECT jsonb_array_length(sessions) FROM public.portal_work_days WHERE work_date=d)<>1 THEN RAISE EXCEPTION 'pending changed work'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.portal_time_requests WHERE id=r AND requested_until=start_at+interval '2 hours' AND status='pending') THEN RAISE EXCEPTION 'interval not stored'; END IF;
 BEGIN PERFORM public.review_attendance(r,'approved',''); RAISE EXCEPTION 'employee approved'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF has_function_privilege('anon','public.request_attendance_interval(date,text,timestamptz,timestamptz,text)','execute') THEN RAISE EXCEPTION 'anonymous callable'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','44444444-4444-4444-8444-444444444444',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN IF (SELECT count(*) FROM public.portal_time_requests)<>0 THEN RAISE EXCEPTION 'cross-user leak'; END IF; END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r uuid; d date:=(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date-2; BEGIN
 IF public.portal_access()<>'super_admin' THEN RAISE EXCEPTION 'admin missing'; END IF;
 SELECT id INTO r FROM public.portal_time_requests WHERE user_id='33333333-3333-4333-8333-333333333333' AND status='pending';
 PERFORM public.review_attendance(r,'approved','تأیید بازه کامل مأموریت');
 IF NOT EXISTS(SELECT 1 FROM public.portal_work_days,jsonb_array_elements(sessions) m WHERE user_id='33333333-3333-4333-8333-333333333333' AND m->>'mode'='mission' AND (m->>'end')::timestamptz=(d::text||'T12:00:00+03:30')::timestamptz) THEN RAISE EXCEPTION 'mission not applied atomically'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.portal_time_requests WHERE id=r AND status='approved' AND reviewer_id=auth.uid()) THEN RAISE EXCEPTION 'review audit missing'; END IF;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE d date:=(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date-2; t timestamptz:=(d::text||'T11:00:00+03:30')::timestamptz; BEGIN
 BEGIN PERFORM public.request_attendance_interval(d,'mission',t,t+interval '2 hours','مأموریت دارای همپوشانی'); RAISE EXCEPTION 'overlap accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='overlap accepted' THEN RAISE; END IF; END;
 PERFORM public.request_attendance_interval(d-1,'remote',t-interval '1 day',t-interval '1 day'+interval '2 hours','ثبت ورود و خروج با هم');
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r uuid; d date:=(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date-3; BEGIN
 SELECT id INTO r FROM public.portal_time_requests WHERE user_id='33333333-3333-4333-8333-333333333333' AND status='pending';
 PERFORM public.review_attendance(r,'approved','تأیید ورود و خروج با هم');
 IF NOT EXISTS(SELECT 1 FROM public.portal_work_days WHERE user_id='33333333-3333-4333-8333-333333333333' AND work_date=d AND sessions->0->>'mode'='remote' AND sessions->0->>'end' IS NOT NULL) THEN RAISE EXCEPTION 'pair not applied'; END IF;
END $$;
RESET ROLE;
-- Existing revision/overlap protections continue to apply to interval approvals.
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE d date:=(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date-2; t timestamptz:=(d::text||'T13:00:00+03:30')::timestamptz; BEGIN
 PERFORM public.request_attendance_interval(d,'mission',t,t+interval '1 hour','درخواست قبل از تغییر کار');
END $$;
RESET ROLE;
UPDATE public.portal_work_days SET revision=revision+1 WHERE user_id='33333333-3333-4333-8333-333333333333';
SELECT set_config('request.jwt.claim.sub','fd5162f3-916e-4294-9b96-b584ecea2888',true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE r uuid; BEGIN
 SELECT id INTO r FROM public.portal_time_requests WHERE user_id='33333333-3333-4333-8333-333333333333' AND status='pending';
 BEGIN PERFORM public.review_attendance(r,'approved',''); RAISE EXCEPTION 'stale accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='stale accepted' THEN RAISE; END IF; END;
 PERFORM public.review_attendance(r,'rejected','کارکرد تغییر کرده است');
END $$;
RESET ROLE;
ROLLBACK;
