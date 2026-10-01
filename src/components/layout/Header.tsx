'use client';

import React from 'react';
import Link from 'next/link';
import { UserProfile } from '@/types/attendance';
import { LogOut, Clock, Calendar, ShieldCheck, LayoutGrid } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { ProfileImage } from '@/components/portal/ProfileImage';

interface HeaderProps {
  profile?: UserProfile | null;
  authenticated?: boolean;
  isSuperAdmin?: boolean;
  avatar?: string | null;
  gender?: string | null;
}

export function Header({ profile, authenticated = false, isSuperAdmin = false, avatar, gender }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'hr_admin':
        return 'مدیر منابع انسانی';
      case 'manager':
        return 'مدیر واحد';
      default:
        return 'کارمند زیلبر';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#16214f] text-white shadow-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand & Logo */}
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-lg shadow-inner text-white">
                Z
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold tracking-wide text-lg text-white">زیلبر</span>
                <span className="text-[11px] text-blue-200/80 -mt-1 tracking-wider uppercase font-medium">Zilber Portal</span>
              </div>
            </Link>

            <nav aria-label="ابزارهای پورتال" className="hidden md:flex items-center gap-1">
              <Link href="/dashboard" className="px-3 py-2 rounded-lg text-sm hover:bg-white/10 flex items-center gap-1.5"><LayoutGrid className="w-4 h-4" />ابزارها</Link>
              <Link
                href="/attendance"
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors text-white flex items-center gap-1.5"
              >
                <Clock className="w-4 h-4 text-blue-300" />
                تردد و کارکرد
              </Link>
              <Link
                href="/leaves"
                className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors text-white/80 hover:text-white flex items-center gap-1.5"
              >
                <Calendar className="w-4 h-4 text-blue-300" />
                مرخصی و مأموریت
              </Link>
              {isSuperAdmin && (
                <Link
                  href="/people"
                  className="px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors text-blue-200 hover:text-white flex items-center gap-1.5 bg-blue-500/20"
                >
                  <ShieldCheck className="w-4 h-4 text-blue-300" />
                  پنل سوپرادمین
                </Link>
              )}
            </nav>
          </div>

          {/* User profile & actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {profile ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-sm font-semibold text-white text-right">{profile.full_name}</span>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-[11px] text-blue-200/80">{profile.department}</span>
                    <span className="inline-block w-1 h-1 rounded-full bg-blue-400"></span>
                    <span className="text-[11px] text-blue-300 font-medium">{getRoleLabel(profile.role)}</span>
                  </div>
                </div>

                <div className="w-9 h-9 rounded-full bg-blue-700/60 border border-blue-400/30 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                  <ProfileImage src={avatar} gender={gender} alt={profile.full_name} width={36} height={36} className="w-full h-full rounded-full object-cover" />
                </div>

                <button
                  onClick={handleLogout}
                  title="خروج از حساب"
                  className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : authenticated ? (
              <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-white/10" aria-label="خروج از حساب"><LogOut size={18} /></button>
            ) : (
              <Link
                href="/login"
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                ورود پرسنل
              </Link>
            )}
          </div>
        </div>
        <Link href="/dashboard" className="md:hidden flex items-center gap-2 py-3 text-sm text-blue-100"><LayoutGrid size={16} />همهٔ ابزارها</Link>
      </div>
    </header>
  );
}
