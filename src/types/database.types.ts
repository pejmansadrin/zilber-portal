import type { EmployeeTables } from './employee';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: EmployeeTables & {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          employee_code: string;
          email: string;
          department: string;
          role: 'employee' | 'manager' | 'hr_admin';
          phone: string | null;
          avatar_url: string | null;
          work_start_time: string;
          work_end_time: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          employee_code?: string;
          email: string;
          department?: string;
          role?: 'employee' | 'manager' | 'hr_admin';
          phone?: string | null;
          avatar_url?: string | null;
          work_start_time?: string;
          work_end_time?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          employee_code?: string;
          email?: string;
          department?: string;
          role?: 'employee' | 'manager' | 'hr_admin';
          phone?: string | null;
          avatar_url?: string | null;
          work_start_time?: string;
          work_end_time?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance_logs: {
        Row: {
          id: string;
          user_id: string;
          work_date: string;
          clock_in: string;
          clock_out: string | null;
          status: 'present' | 'late' | 'early_leave' | 'absent' | 'remote';
          work_duration_minutes: number;
          late_minutes: number;
          early_leave_minutes: number;
          overtime_minutes: number;
          location_type: 'office' | 'remote' | 'field';
          ip_address: string | null;
          device_info: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          work_date?: string;
          clock_in?: string;
          clock_out?: string | null;
          status?: 'present' | 'late' | 'early_leave' | 'absent' | 'remote';
          work_duration_minutes?: number;
          late_minutes?: number;
          early_leave_minutes?: number;
          overtime_minutes?: number;
          location_type?: 'office' | 'remote' | 'field';
          ip_address?: string | null;
          device_info?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          work_date?: string;
          clock_in?: string;
          clock_out?: string | null;
          status?: 'present' | 'late' | 'early_leave' | 'absent' | 'remote';
          work_duration_minutes?: number;
          late_minutes?: number;
          early_leave_minutes?: number;
          overtime_minutes?: number;
          location_type?: 'office' | 'remote' | 'field';
          ip_address?: string | null;
          device_info?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "attendance_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      leave_requests: {
        Row: {
          id: string;
          user_id: string;
          type: 'daily_paid' | 'daily_unpaid' | 'sick' | 'hourly';
          start_date: string;
          end_date: string;
          hours: number;
          reason: string;
          attachment_url: string | null;
          status: 'pending' | 'approved' | 'rejected';
          approver_id: string | null;
          manager_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'daily_paid' | 'daily_unpaid' | 'sick' | 'hourly';
          start_date: string;
          end_date: string;
          hours?: number;
          reason: string;
          attachment_url?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          approver_id?: string | null;
          manager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'daily_paid' | 'daily_unpaid' | 'sick' | 'hourly';
          start_date?: string;
          end_date?: string;
          hours?: number;
          reason?: string;
          attachment_url?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          approver_id?: string | null;
          manager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leave_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      mission_requests: {
        Row: {
          id: string;
          user_id: string;
          destination: string;
          start_date: string;
          end_date: string;
          purpose: string;
          transport_type: string | null;
          status: 'pending' | 'approved' | 'rejected';
          approver_id: string | null;
          manager_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          destination: string;
          start_date: string;
          end_date: string;
          purpose: string;
          transport_type?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          approver_id?: string | null;
          manager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          destination?: string;
          start_date?: string;
          end_date?: string;
          purpose?: string;
          transport_type?: string | null;
          status?: 'pending' | 'approved' | 'rejected';
          approver_id?: string | null;
          manager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance_adjustments: {
        Row: {
          id: string;
          attendance_log_id: string | null;
          user_id: string;
          target_date: string;
          requested_clock_in: string | null;
          requested_clock_out: string | null;
          reason: string;
          status: 'pending' | 'approved' | 'rejected';
          approver_id: string | null;
          manager_note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          attendance_log_id?: string | null;
          user_id: string;
          target_date: string;
          requested_clock_in?: string | null;
          requested_clock_out?: string | null;
          reason: string;
          status?: 'pending' | 'approved' | 'rejected';
          approver_id?: string | null;
          manager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          attendance_log_id?: string | null;
          user_id?: string;
          target_date?: string;
          requested_clock_in?: string | null;
          requested_clock_out?: string | null;
          reason?: string;
          status?: 'pending' | 'approved' | 'rejected';
          approver_id?: string | null;
          manager_note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_manager_or_hr: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
