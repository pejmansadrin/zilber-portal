BEGIN;
INSERT INTO auth.users(id,email,raw_app_meta_data,raw_user_meta_data)
VALUES ('33333333-3333-4333-8333-333333333333','attendance-policy-qa@example.invalid','{}','{}');
INSERT INTO public.portal_work_days(user_id,work_date,sessions)
VALUES ('33333333-3333-4333-8333-333333333333',(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date,
 jsonb_build_array(jsonb_build_object('start',clock_timestamp()-interval '3 hours','end',NULL,'mode','office')));
SELECT set_config('request.jwt.claim.sub','33333333-3333-4333-8333-333333333333',true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE t timestamptz; result jsonb; test record;
BEGIN
 FOR test IN SELECT * FROM (VALUES
  ('end',interval '-14 minutes',false,true),
  ('end',interval '15 minutes',false,true),
  ('end',interval '16 minutes',true,false),
  ('end',interval '-16 minutes',false,false),
  ('end',interval '-16 minutes',true,true),
  ('end',interval '-4 hours',true,false),
  ('end',interval '-3 hours',true,false),
  ('start',interval '1 minute',true,false),
  ('start',interval '-16 minutes',true,false)
 ) AS cases(event,delta,ack,accepted) LOOP
  t:=clock_timestamp()+test.delta;
  IF test.delta=interval '-3 hours' THEN
   SELECT (sessions->0->>'start')::timestamptz INTO t FROM public.portal_work_days WHERE user_id=auth.uid();
  END IF;
  BEGIN
   result:=public.register_attendance_checked(t,test.event,'office',test.ack);
   IF NOT test.accepted THEN RAISE EXCEPTION 'TEST: invalid timestamp accepted'; END IF;
   IF (result->'sessions'->0->>'end')::timestamptz<>t THEN RAISE EXCEPTION 'TEST: exit not persisted'; END IF;
   RAISE EXCEPTION 'TEST: rollback successful case' USING ERRCODE='P0002';
  EXCEPTION
   WHEN no_data_found THEN NULL;
   WHEN raise_exception THEN
    IF SQLERRM LIKE 'TEST:%' OR test.accepted THEN RAISE; END IF;
  END;
 END LOOP;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN
  PERFORM public.register_attendance_checked(clock_timestamp(),'end','office',true);
  RAISE EXCEPTION 'anonymous allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
