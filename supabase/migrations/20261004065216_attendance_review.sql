BEGIN;
-- Persist the multi-session attendance model against Auth, without legacy profiles.
CREATE TABLE public.portal_work_days (
 user_id uuid NOT NULL REFERENCES auth.users(id), work_date date NOT NULL,
 sessions jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(sessions)='array'),
 revision integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,work_date)
);
CREATE TABLE public.portal_time_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id),
 work_date date NOT NULL, kind text NOT NULL CHECK(kind IN ('time','late')),
 action text CHECK(action IN ('start','end')), mode text CHECK(mode IN ('office','remote','mission')),
 requested_at timestamptz, session_index integer, base_revision integer NOT NULL,
 original_sessions jsonb NOT NULL,
 reason text NOT NULL CHECK(length(btrim(reason)) BETWEEN 5 AND 2000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 reviewer_id uuid REFERENCES auth.users(id), review_note text, reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='time' AND action IS NOT NULL AND mode IS NOT NULL AND requested_at IS NOT NULL) OR
       (kind='late' AND action IS NULL AND mode IS NULL AND requested_at IS NULL AND session_index IS NULL))
);
CREATE INDEX portal_work_days_date ON public.portal_work_days(work_date DESC);
CREATE INDEX portal_time_requests_owner ON public.portal_time_requests(user_id,created_at DESC);
CREATE UNIQUE INDEX portal_time_requests_one_pending ON public.portal_time_requests(user_id,work_date,kind) WHERE status='pending';
ALTER TABLE public.portal_work_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_time_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.portal_work_days,public.portal_time_requests FROM anon,authenticated;
GRANT SELECT ON public.portal_work_days,public.portal_time_requests TO authenticated;
CREATE POLICY attendance_read ON public.portal_work_days FOR SELECT TO authenticated
 USING(user_id=(select auth.uid()) OR (select private.portal_role())='super_admin');
CREATE POLICY attendance_requests_read ON public.portal_time_requests FOR SELECT TO authenticated
 USING(user_id=(select auth.uid()) OR (select private.portal_role())='super_admin');

-- Pure transition helper. All mutation entry points validate time and identity separately.
CREATE FUNCTION private.attendance_transition(sessions jsonb, at_time timestamptz, event text, work_mode text, edit_index integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path='' AS $$
DECLARE result jsonb:=sessions; item jsonb; idx integer; base_idx integer; mission_idx integer;
 latest timestamptz; previous_end timestamptz; start_time timestamptz; end_time timestamptz; i integer:=0;
BEGIN
 IF at_time IS NULL OR event IS NULL OR event NOT IN ('start','end') OR work_mode IS NULL OR work_mode NOT IN ('office','remote','mission') THEN
 RAISE EXCEPTION 'اطلاعات تردد نامعتبر است.'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(sessions) LOOP
  IF item->>'end' IS NULL THEN
   IF item->>'mode'='mission' THEN mission_idx:=i; ELSE base_idx:=i; END IF;
  END IF;
  IF latest IS NULL OR coalesce((item->>'end')::timestamptz,(item->>'start')::timestamptz)>latest THEN
   latest:=coalesce((item->>'end')::timestamptz,(item->>'start')::timestamptz); END IF;
  i:=i+1;
 END LOOP;
 IF edit_index IS NOT NULL THEN
  IF edit_index<0 OR edit_index>=jsonb_array_length(sessions) OR sessions->edit_index->>'mode'<>work_mode THEN
   RAISE EXCEPTION 'بازهٔ انتخاب‌شده معتبر نیست.'; END IF;
  result:=jsonb_set(result,ARRAY[edit_index::text,CASE WHEN event='start' THEN 'start' ELSE 'end' END],to_jsonb(at_time));
 ELSE
  IF latest IS NOT NULL AND at_time<latest THEN RAISE EXCEPTION 'ساعت نمی‌تواند قبل از آخرین ثبت باشد؛ اصلاح بازه را انتخاب کنید.'; END IF;
  IF work_mode<>'mission' AND mission_idx IS NOT NULL THEN RAISE EXCEPTION 'ابتدا مأموریت را پایان دهید.'; END IF;
  idx:=CASE WHEN work_mode='mission' THEN mission_idx ELSE base_idx END;
  IF event='start' THEN
   IF work_mode='mission' AND base_idx IS NULL THEN RAISE EXCEPTION 'ابتدا ورود عادی یا دورکاری را ثبت کنید.'; END IF;
   IF idx IS NOT NULL AND sessions->idx->>'mode'=work_mode THEN RAISE EXCEPTION 'این نوع کار هم‌اکنون فعال است.'; END IF;
  ELSIF idx IS NULL OR sessions->idx->>'mode'<>work_mode THEN RAISE EXCEPTION 'بازهٔ فعالی برای خروج وجود ندارد.'; END IF;
  IF idx IS NOT NULL THEN result:=jsonb_set(result,ARRAY[idx::text,'end'],to_jsonb(at_time)); END IF;
  IF event='start' THEN result:=result || jsonb_build_array(jsonb_build_object('start',at_time,'end',NULL,'mode',work_mode)); END IF;
 END IF;
 -- Validate positive duration, ordered base intervals, and mission containment after every edit.
 FOR item IN SELECT value FROM jsonb_array_elements(result) WHERE value->>'mode'<>'mission' LOOP
  start_time:=(item->>'start')::timestamptz; end_time:=(item->>'end')::timestamptz;
  IF end_time IS NOT NULL AND end_time<=start_time THEN RAISE EXCEPTION 'خروج باید بعد از ورود باشد.'; END IF;
  IF previous_end IS NOT NULL AND start_time<previous_end THEN RAISE EXCEPTION 'بازه‌های کار نباید هم‌پوشانی داشته باشند.'; END IF;
  previous_end:=coalesce(end_time,'infinity'::timestamptz);
 END LOOP;
 previous_end:=NULL;
 FOR item IN SELECT value FROM jsonb_array_elements(result) WHERE value->>'mode'='mission' LOOP
  start_time:=(item->>'start')::timestamptz; end_time:=(item->>'end')::timestamptz;
  IF end_time IS NOT NULL AND end_time<=start_time THEN RAISE EXCEPTION 'پایان مأموریت باید بعد از شروع باشد.'; END IF;
  IF previous_end IS NOT NULL AND start_time<previous_end THEN RAISE EXCEPTION 'بازه‌های مأموریت نباید هم‌پوشانی داشته باشند.'; END IF;
  previous_end:=coalesce(end_time,'infinity'::timestamptz);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result) b WHERE b->>'mode'<>'mission'
   AND (b->>'start')::timestamptz<=start_time
   AND coalesce((b->>'end')::timestamptz,'infinity'::timestamptz)>=coalesce(end_time,'infinity'::timestamptz)) THEN
   RAISE EXCEPTION 'مأموریت باید داخل بازهٔ کار باشد.'; END IF;
 END LOOP;
 RETURN result;
END $$;

CREATE FUNCTION private.register_attendance(at_time timestamptz,event text,work_mode text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid:=auth.uid(); day_date date; row_data public.portal_work_days; result jsonb;
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF at_time IS NULL OR at_time>clock_timestamp() OR at_time<clock_timestamp()-interval '15 minutes' THEN
 RAISE EXCEPTION 'ثبت عادی فقط از ۱۵ دقیقه قبل تا اکنون مجاز است.'; END IF;
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

CREATE FUNCTION private.request_attendance(day_date date,request_kind text,event text,work_mode text,at_time timestamptz,edit_index integer,explanation text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid:=auth.uid(); row_data public.portal_work_days; request_id uuid;
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF day_date IS NULL OR day_date>(clock_timestamp() AT TIME ZONE 'Asia/Tehran')::date OR request_kind IS NULL OR request_kind NOT IN ('time','late')
 OR explanation IS NULL OR length(btrim(explanation)) NOT BETWEEN 5 AND 2000 THEN RAISE EXCEPTION 'تاریخ و توضیح معتبر لازم است (۵ تا ۲۰۰۰ نویسه).'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('attendance:'||owner_id::text,0));
 SELECT * INTO row_data FROM public.portal_work_days WHERE user_id=owner_id AND work_date=day_date;
 IF request_kind='time' THEN
  IF at_time IS NULL OR at_time>clock_timestamp() OR (at_time AT TIME ZONE 'Asia/Tehran')::date<day_date
  OR (at_time AT TIME ZONE 'Asia/Tehran')::date>day_date+1 THEN RAISE EXCEPTION 'ساعت درخواستی نامعتبر یا در آینده است.'; END IF;
  IF row_data.user_id IS NULL AND (at_time AT TIME ZONE 'Asia/Tehran')::date<>day_date THEN RAISE EXCEPTION 'ورود باید در تاریخ انتخاب‌شده باشد.'; END IF;
  IF ((private.attendance_transition(coalesce(row_data.sessions,'[]'),at_time,event,work_mode,edit_index)->0->>'start')::timestamptz AT TIME ZONE 'Asia/Tehran')::date<>day_date THEN
   RAISE EXCEPTION 'اولین ورود باید در تاریخ انتخاب‌شده باشد.'; END IF;
 ELSE
  IF row_data.user_id IS NULL THEN RAISE EXCEPTION 'ابتدا تردد روز را ثبت کنید.'; END IF;
  event:=NULL; work_mode:=NULL; at_time:=NULL; edit_index:=NULL;
 END IF;
 INSERT INTO public.portal_time_requests(user_id,work_date,kind,action,mode,requested_at,session_index,base_revision,original_sessions,reason)
 VALUES(owner_id,day_date,request_kind,event,work_mode,at_time,edit_index,coalesce(row_data.revision,0),coalesce(row_data.sessions,'[]'),btrim(explanation)) RETURNING id INTO request_id;
 RETURN request_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'برای این روز یک درخواست در انتظار بررسی دارید.';
END $$;

CREATE FUNCTION private.review_attendance(request_id uuid,decision text,note text)
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
  result:=private.attendance_transition(coalesce(row_data.sessions,'[]'),req.requested_at,req.action,req.mode,req.session_index);
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
-- Public invoker wrappers; privileged implementations stay in the unexposed schema.
CREATE FUNCTION public.register_attendance(at_time timestamptz,event text,work_mode text) RETURNS jsonb
 LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.register_attendance(at_time,event,work_mode); $$;
CREATE FUNCTION public.request_attendance(day_date date,request_kind text,event text,work_mode text,at_time timestamptz,edit_index integer,explanation text) RETURNS uuid
 LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.request_attendance(day_date,request_kind,event,work_mode,at_time,edit_index,explanation); $$;
CREATE FUNCTION public.review_attendance(request_id uuid,decision text,note text) RETURNS void
 LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.review_attendance(request_id,decision,note); $$;
REVOKE ALL ON FUNCTION private.attendance_transition(jsonb,timestamptz,text,text,integer) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION private.register_attendance(timestamptz,text,text),private.request_attendance(date,text,text,text,timestamptz,integer,text),private.review_attendance(uuid,text,text),
 public.register_attendance(timestamptz,text,text),public.request_attendance(date,text,text,text,timestamptz,integer,text),public.review_attendance(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.register_attendance(timestamptz,text,text),private.request_attendance(date,text,text,text,timestamptz,integer,text),private.review_attendance(uuid,text,text),
 public.register_attendance(timestamptz,text,text),public.request_attendance(date,text,text,text,timestamptz,integer,text),public.review_attendance(uuid,text,text) TO authenticated;
COMMIT;
