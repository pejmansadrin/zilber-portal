export type UserRole = 'employee' | 'manager' | 'hr_admin';

export type AttendanceStatus = 'present' | 'late' | 'early_leave' | 'absent' | 'remote';

export type LocationType = 'office' | 'remote' | 'field';

export type LeaveType = 'daily_paid' | 'daily_unpaid' | 'sick' | 'hourly';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  full_name: string;
  employee_code: string;
  email: string;
  department: string;
  role: UserRole;
  phone?: string | null;
  avatar_url?: string | null;
  work_start_time: string; // e.g. "08:30:00"
  work_end_time: string;   // e.g. "17:00:00"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AttendanceLog {
  id: string;
  user_id: string;
  work_date: string; // YYYY-MM-DD
  clock_in: string;  // ISO timestamp
  clock_out: string | null;
  status: AttendanceStatus;
  work_duration_minutes: number;
  late_minutes: number;
  early_leave_minutes: number;
  overtime_minutes: number;
  location_type: LocationType;
  ip_address?: string | null;
  device_info?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
}

export interface LeaveRequest {
  id: string;
  user_id: string;
  type: LeaveType;
  start_date: string;
  end_date: string;
  hours: number;
  reason: string;
  attachment_url?: string | null;
  status: RequestStatus;
  approver_id?: string | null;
  manager_note?: string | null;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
  approver?: UserProfile;
}

export interface MissionRequest {
  id: string;
  user_id: string;
  destination: string;
  start_date: string;
  end_date: string;
  purpose: string;
  transport_type?: string | null;
  status: RequestStatus;
  approver_id?: string | null;
  manager_note?: string | null;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
  approver?: UserProfile;
}

export interface AttendanceAdjustment {
  id: string;
  attendance_log_id?: string | null;
  user_id: string;
  target_date: string;
  requested_clock_in?: string | null;
  requested_clock_out?: string | null;
  reason: string;
  status: RequestStatus;
  approver_id?: string | null;
  manager_note?: string | null;
  created_at: string;
  updated_at: string;
  profile?: UserProfile;
  approver?: UserProfile;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  leaveDays: number;
  missionDays: number;
  totalWorkMinutes: number;
  totalOvertimeMinutes: number;
  totalLateMinutes: number;
}
