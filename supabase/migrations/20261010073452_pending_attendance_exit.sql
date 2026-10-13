BEGIN;
-- Share the review/registration lock so an approval racing with exit is safe.
CREATE FUNCTION private.close_pending_attendance(request_id uuid, at_time timestamptz, acknowledge_early_exit boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid := auth.uid(); req public.portal_time_requests; row_data public.portal_work_days; registration_now timestamptz := clock_timestamp();
BEGIN
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('attendance:'||owner_id::text,0));
 SELECT * INTO req FROM public.portal_time_requests WHERE id=request_id AND user_id=owner_id FOR UPDATE;
 IF req.id IS NULL THEN RAISE EXCEPTION 'درخواست پیدا نشد.'; END IF;
 IF req.kind<>'time' OR req.action<>'start' OR req.mode NOT IN ('office','remote') OR req.session_index IS NOT NULL OR req.requested_until IS NOT NULL OR req.status='rejected' THEN
  RAISE EXCEPTION 'این درخواست ورود قابل ثبت خروج نیست؛ وضعیت تردد را تازه کنید.'; END IF;
 IF at_time IS NULL OR at_time<=req.requested_at OR at_time>registration_now+interval '15 minutes' THEN
  RAISE EXCEPTION 'خروج باید بعد از ورود و حداکثر ۱۵ دقیقه بعد از اکنون باشد.'; END IF;
 IF (at_time AT TIME ZONE 'Asia/Tehran')::date<(registration_now AT TIME ZONE 'Asia/Tehran')::date OR (at_time AT TIME ZONE 'Asia/Tehran')::date>req.work_date+1 THEN
  RAISE EXCEPTION 'برای خروج روزهای گذشته درخواست اصلاح تردد بفرستید.'; END IF;
 IF at_time<registration_now-interval '15 minutes' AND acknowledge_early_exit IS DISTINCT FROM true THEN
  RAISE EXCEPTION 'ثبت خروج زودتر نیازمند تأیید هشدار است.'; END IF;
 SELECT * INTO row_data FROM public.portal_work_days WHERE user_id=owner_id AND work_date=req.work_date;
 IF req.status='approved' THEN
  -- Approval may have happened since the employee loaded the page. Only close
  -- the exact session created by this request, never a different active entry.
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(row_data.sessions,'[]')) s
    WHERE (s->>'start')::timestamptz=req.requested_at AND s->>'mode'=req.mode AND s->>'end' IS NULL) THEN
   RAISE EXCEPTION 'ورود تأییدشده دیگر باز نیست؛ وضعیت تردد را تازه کنید.'; END IF;
  PERFORM private.register_attendance_checked(at_time,'end',req.mode,acknowledge_early_exit);
  RETURN;
 END IF;
 IF coalesce(row_data.revision,0)<>req.base_revision THEN
  RAISE EXCEPTION 'تردد پس از درخواست تغییر کرده؛ درخواست باید دوباره بررسی شود.'; END IF;
 PERFORM private.attendance_interval(coalesce(row_data.sessions,'[]'),req.requested_at,at_time,req.mode);
 UPDATE public.portal_time_requests SET requested_until=at_time WHERE id=req.id;
END $$;
CREATE FUNCTION public.close_pending_attendance(request_id uuid,at_time timestamptz,acknowledge_early_exit boolean DEFAULT false)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$
 SELECT private.close_pending_attendance(request_id,at_time,acknowledge_early_exit);
$$;
REVOKE ALL ON FUNCTION private.close_pending_attendance(uuid,timestamptz,boolean),public.close_pending_attendance(uuid,timestamptz,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.close_pending_attendance(uuid,timestamptz,boolean),public.close_pending_attendance(uuid,timestamptz,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
