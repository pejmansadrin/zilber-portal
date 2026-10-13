BEGIN;
DO $$
DECLARE sessions jsonb; result jsonb; t timestamptz := clock_timestamp();
BEGIN
 sessions := jsonb_build_array(jsonb_build_object('start',t-interval '1 hour','end',NULL,'mode','remote'));
 BEGIN
  PERFORM private.attendance_transition(sessions,t,'end','office');
  RAISE EXCEPTION 'TEST: stale mode was allowed to close a different interval';
 EXCEPTION WHEN SQLSTATE 'P1002' THEN NULL; END;
 result := private.attendance_transition(sessions,t,'end','remote');
 IF (result->0->>'end')::timestamptz <> t THEN RAISE EXCEPTION 'TEST: remote exit missing'; END IF;
 BEGIN
  PERFORM private.attendance_transition(result,t,'end','remote');
  RAISE EXCEPTION 'TEST: duplicate exit accepted';
 EXCEPTION WHEN SQLSTATE 'P1001' THEN NULL; END;
 BEGIN
  PERFORM private.attendance_transition('[]',t,'end','office');
  RAISE EXCEPTION 'TEST: exit without entry accepted';
 EXCEPTION WHEN SQLSTATE 'P1001' THEN NULL; END;
 BEGIN
  PERFORM private.attendance_transition(sessions,t,'end','mission');
  RAISE EXCEPTION 'TEST: mission exit closed ordinary work';
 EXCEPTION WHEN SQLSTATE 'P1001' THEN NULL; END;
 IF sessions->0->>'end' IS NOT NULL THEN RAISE EXCEPTION 'TEST: original session changed'; END IF;
END $$;
ROLLBACK;
