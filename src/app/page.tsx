import { redirect } from 'next/navigation';
import { getSessionUser } from '@/actions/attendance';

export default async function HomePage() {
  const session = await getSessionUser();
  if (session) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
