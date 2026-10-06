BEGIN;
ALTER TABLE public.portal_time_requests ADD COLUMN requested_until timestamptz;
ALTER TABLE public.portal_time_requests ADD CONSTRAINT portal_time_request_interval CHECK (
 requested_until IS NULL OR (kind='time' AND action='start' AND mode IS NOT NULL AND session_index IS NULL AND requested_at IS NOT NULL AND requested_until>requested_at));

-- Construct the complete interval before validating: a retrospective mission can
-- belong to an already closed work session without an intermediate open mission.
CREATE FUNCTION private.attendance_interval(sessions jsonb,at_time timestamptz,until_time timestamptz,work_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF at_time IS NULL OR until_time IS NULL OR until_time<=at_time OR work_mode IS NULL OR work_mode NOT IN ('office','remote','mission') THEN
  RAISE EXCEPTION 'شروع و پایان بازه را معتبر وارد کنید.'; END IF;
 SELECT jsonb_agg(item ORDER BY CASE WHEN item->>'mode'='mission' THEN 1 ELSE 0 END,(item->>'start')::timestamptz)
 INTO result FROM jsonb_array_elements(sessions || jsonb_build_array(jsonb_build_object('start',at_time,'end',until_time,'mode',work_mode))) item;
 -- Reuse all existing duration, overlap and mission-containment checks.
 RETURN private.attendance_transition(result,(result->0->>'start')::timestamptz,'start',result->0->>'mode',0);
END $$;

CREATE FUNCTION private.request_attendance_interval(day_date date,work_mode text,at_time timestamptz,until_time timestamptz,explanation text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid:=auth.uid(); row_data public.portal_work_days; result jsonb; request_id uuid;
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF day_date IS NULL OR day_date>(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date
 OR explanation IS NULL OR length(btrim(explanation)) NOT BETWEEN 5 AND 2000 THEN
  RAISE EXCEPTION 'تاریخ و توضیح معتبر لازم است (۵ تا ۲۰۰۰ نویسه).'; END IF;
 IF at_time IS NULL OR until_time IS NULL OR until_time>clock_timestamp() OR at_time>clock_timestamp()
 OR (at_time AT TIME ZONE 'Asia/Tehran')::date<day_date OR (until_time AT TIME ZONE 'Asia/Tehran')::date>day_date+1 THEN
  RAISE EXCEPTION 'بازهٔ درخواستی نامعتبر یا در آینده است.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('attendance:'||owner_id::text,0));
 SELECT * INTO row_data FROM public.portal_work_days WHERE user_id=owner_id AND work_date=day_date;
 IF work_mode='mission' AND row_data.user_id IS NULL THEN RAISE EXCEPTION 'ابتدا ساعت کاری را ثبت کنید.'; END IF;
 result:=private.attendance_interval(coalesce(row_data.sessions,'[]'),at_time,until_time,work_mode);
 IF ((result->0->>'start')::timestamptz AT TIME ZONE 'Asia/Tehran')::date<>day_date THEN
  RAISE EXCEPTION 'اولین ورود باید در تاریخ انتخاب‌شده باشد.'; END IF;
 INSERT INTO public.portal_time_requests(user_id,work_date,kind,action,mode,requested_at,requested_until,session_index,base_revision,original_sessions,reason)
 VALUES(owner_id,day_date,'time','start',work_mode,at_time,until_time,NULL,coalesce(row_data.revision,0),coalesce(row_data.sessions,'[]'),btrim(explanation)) RETURNING id INTO request_id;
 RETURN request_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'برای این روز یک درخواست در انتظار بررسی دارید.';
END $$;

CREATE OR REPLACE FUNCTION private.review_attendance(request_id uuid,decision text,note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE req public.portal_time_requests; row_data public.portal_work_days; result jsonb;
BEGIN
 IF auth.uid() IS NULL OR private.portal_role() IS DISTINCT FROM 'super_admin' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF decision IS NULL OR decision NOT IN ('approved','rejected') OR coalesce(length(note),0)>2000 THEN RAISE EXCEPTION 'تصمیم نامعتبر است.'; END IF;
 SELECT * INTO req FROM public.portal_time_requests WHERE id=request_id;
 IF req.id IS NULL THEN RAISE EXCEPTION 'درخواست پیدا نشد.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('attendance:'||req.user_id::text,0));
 SELECT * INTO req FROM public.portal_time_requests WHERE id=request_id FOR UPDATE;
 IF req.status<>'pending' THEN RAISE EXCEPTION 'این درخواست قبلاً بررسی شده است.'; END IF;
 IF decision='approved' AND req.kind='time' THEN
  SELECT * INTO row_data FROM public.portal_work_days WHERE user_id=req.user_id AND work_date=req.work_date;
  IF coalesce(row_data.revision,0)<>req.base_revision THEN RAISE EXCEPTION 'تردد پس از درخواست تغییر کرده؛ درخواست را رد کنید تا کاربر درخواست تازه بفرستد.'; END IF;
  IF req.requested_until IS NOT NULL THEN
   result:=private.attendance_interval(coalesce(row_data.sessions,'[]'),req.requested_at,req.requested_until,req.mode);
  ELSE
   result:=private.attendance_transition(coalesce(row_data.sessions,'[]'),req.requested_at,req.action,req.mode,req.session_index);
  END IF;
  IF EXISTS(SELECT 1 FROM public.portal_work_days d,jsonb_array_elements(d.sessions) s
    WHERE d.user_id=req.user_id AND d.work_date<>req.work_date AND s->>'mode'<>'mission'
    AND EXISTS(SELECT 1 FROM jsonb_array_elements(result) n WHERE n->>'mode'<>'mission'
      AND (n->>'start')::timestamptz<coalesce((s->>'end')::timestamptz,'infinity'::timestamptz)
      AND (s->>'start')::timestamptz<coalesce((n->>'end')::timestamptz,'infinity'::timestamptz))) THEN
   RAISE EXCEPTION 'ساعت درخواستی با تردد روز دیگری هم‌پوشانی دارد.'; END IF;
  INSERT INTO public.portal_work_days(user_id,work_date,sessions,revision) VALUES(req.user_id,req.work_date,result,1)
  ON CONFLICT(user_id,work_date) DO UPDATE SET sessions=excluded.sessions,revision=portal_work_days.revision+1,updated_at=now();
 END IF;
 UPDATE public.portal_time_requests SET status=decision,reviewer_id=auth.uid(),review_note=nullif(btrim(note),''),reviewed_at=now() WHERE id=request_id;
END $$;
CREATE FUNCTION public.request_attendance_interval(day_date date,work_mode text,at_time timestamptz,until_time timestamptz,explanation text)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.request_attendance_interval(day_date,work_mode,at_time,until_time,explanation);
$$;
REVOKE ALL ON FUNCTION private.attendance_interval(jsonb,timestamptz,timestamptz,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.request_attendance_interval(date,text,timestamptz,timestamptz,text),public.request_attendance_interval(date,text,timestamptz,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.request_attendance_interval(date,text,timestamptz,timestamptz,text),public.request_attendance_interval(date,text,timestamptz,timestamptz,text) TO authenticated;
COMMIT;
