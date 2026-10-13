import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function HomePage() {
  if (await getSession()) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
