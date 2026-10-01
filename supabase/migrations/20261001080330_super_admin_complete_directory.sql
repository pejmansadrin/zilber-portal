BEGIN;
-- Super-admins can inspect all employees, including archived records.
-- HR and supervisors retain their existing active-record scope.
CREATE OR REPLACE FUNCTION private.can_manage_employee(target bigint, area text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT (select auth.uid()) IS NOT NULL AND EXISTS (
 SELECT 1 FROM public.employees e WHERE e.id=target AND (
 private.portal_role()='super_admin' OR (e.archived_at IS NULL AND (
 private.portal_role()='hr_admin' OR (
 area IN ('employees','employee_reviews','employee_training','employee_assets') AND
 e.manager_id IN (SELECT m.id FROM public.employees m WHERE m.auth_user_id=(select auth.uid()) AND m.archived_at IS NULL))))));
$$;
REVOKE ALL ON FUNCTION private.can_manage_employee(bigint,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.can_manage_employee(bigint,text) TO authenticated;
COMMIT;
