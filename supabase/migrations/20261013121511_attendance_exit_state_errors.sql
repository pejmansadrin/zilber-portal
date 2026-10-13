-- Preserve transition rules; distinguish stale state from a missing entry.
CREATE OR REPLACE FUNCTION private.attendance_transition(sessions jsonb, at_time timestamp with time zone, event text, work_mode text, edit_index integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  ELSIF idx IS NULL THEN
   IF work_mode='mission' THEN
    RAISE EXCEPTION 'مأموریت بازی برای پایان دادن پیدا نشد؛ ممکن است قبلاً پایان یافته باشد. وضعیت تردد را بررسی کنید.' USING ERRCODE='P1001';
   END IF;
   RAISE EXCEPTION 'ورود بازی برای ثبت خروج پیدا نشد؛ ممکن است خروج قبلاً ثبت شده باشد. وضعیت تردد و درخواست‌های منتظر تأیید را بررسی کنید.' USING ERRCODE='P1001';
  ELSIF sessions->idx->>'mode'<>work_mode THEN
   RAISE EXCEPTION 'نوع کارکرد فعال تغییر کرده است؛ وضعیت تردد را بررسی کنید و دوباره خروج بزنید.' USING ERRCODE='P1002';
  END IF;
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
END $function$
;
