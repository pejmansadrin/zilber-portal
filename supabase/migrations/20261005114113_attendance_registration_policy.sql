BEGIN;
CREATE OR REPLACE FUNCTION private.register_attendance_checked(at_time timestamptz,event text,work_mode text,acknowledge_early_exit boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid:=auth.uid(); day_date date; row_data public.portal_work_days; result jsonb; registration_now timestamptz:=clock_timestamp();
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF at_time IS NULL OR event IS NULL OR event NOT IN ('start','end') THEN
 RAISE EXCEPTION 'اطلاعات تردد نامعتبر است.'; END IF;
 IF event='start' AND (at_time>registration_now OR at_time<registration_now-interval '15 minutes') THEN
 RAISE EXCEPTION 'ورود فقط از ۱۵ دقیقه قبل تا اکنون مجاز است؛ ورود قدیمی‌تر نیازمند تأیید مدیر است.'; END IF;
 IF event='end' THEN
  IF at_time>registration_now+interval '15 minutes' THEN RAISE EXCEPTION 'خروج بیش از ۱۵ دقیقه بعد از اکنون مجاز نیست.'; END IF;
  IF at_time<registration_now-interval '15 minutes' AND acknowledge_early_exit IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'ثبت خروج زودتر نیازمند تأیید هشدار است.'; END IF;
  IF (at_time AT TIME ZONE 'Asia/Tehran')::date < (registration_now AT TIME ZONE 'Asia/Tehran')::date THEN
   RAISE EXCEPTION 'برای خروج روزهای گذشته درخواست اصلاح تردد بفرستید.'; END IF;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('attendance:'||owner_id::text,0));
 -- Close overnight sessions on the day they started.
 SELECT * INTO row_data FROM public.portal_work_days d WHERE d.user_id=owner_id
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(d.sessions) s WHERE s->>'mode'<>'mission' AND s->>'end' IS NULL)
 ORDER BY work_date DESC LIMIT 1;
 day_date:=coalesce(row_data.work_date,(at_time AT TIME ZONE 'Asia/Tehran')::date);
 IF row_data.user_id IS NULL THEN SELECT * INTO row_data FROM public.portal_work_days WHERE user_id=owner_id AND work_date=day_date; END IF;
 result:=private.attendance_transition(coalesce(row_data.sessions,'[]'),at_time,event,work_mode);
 IF EXISTS(SELECT 1 FROM public.portal_work_days d,jsonb_array_elements(d.sessions) s
 WHERE d.user_id=owner_id AND d.work_date<>day_date AND s->>'mode'<>'mission'
 AND EXISTS(SELECT 1 FROM jsonb_array_elements(result) n WHERE n->>'mode'<>'mission'
 AND (n->>'start')::timestamptz<coalesce((s->>'end')::timestamptz,'infinity'::timestamptz)
 AND (s->>'start')::timestamptz<coalesce((n->>'end')::timestamptz,'infinity'::timestamptz))) THEN
 RAISE EXCEPTION 'ساعت با تردد روز دیگری هم‌پوشانی دارد.'; END IF;
 INSERT INTO public.portal_work_days(user_id,work_date,sessions,revision) VALUES(owner_id,day_date,result,1)
 ON CONFLICT(user_id,work_date) DO UPDATE SET sessions=excluded.sessions,revision=portal_work_days.revision+1,updated_at=now();
 RETURN jsonb_build_object('date',day_date,'sessions',result);
END $$;


CREATE OR REPLACE FUNCTION private.register_attendance(at_time timestamptz,event text,work_mode text)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.register_attendance_checked(at_time,event,work_mode,false);
$$;
CREATE OR REPLACE FUNCTION public.register_attendance_checked(at_time timestamptz,event text,work_mode text,acknowledge_early_exit boolean DEFAULT false)
RETURNS jsonb LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.register_attendance_checked(at_time,event,work_mode,acknowledge_early_exit);
$$;
REVOKE ALL ON FUNCTION private.register_attendance_checked(timestamptz,text,text,boolean),public.register_attendance_checked(timestamptz,text,text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.register_attendance_checked(timestamptz,text,text,boolean),public.register_attendance_checked(timestamptz,text,text,boolean) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
