import { getCloudConfig } from './config';
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const config = getCloudConfig();
  if (!config) {
    if (request.nextUrl.pathname === '/login') return NextResponse.next({ request });
    return NextResponse.redirect(new URL('/login', request.url));
  }
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    config.url,
    config.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: claims,
  } = await supabase.auth.getClaims();

  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth');

  if (!claims?.claims && !isAuthPage && request.nextUrl.pathname !== '/') {
    // If not logged in and requesting protected area, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    for (const header of ['cache-control', 'expires', 'pragma']) {
      const value = supabaseResponse.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  if (claims?.claims && isAuthPage) {
    // If logged in and visiting login page, redirect to dashboard
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    const redirect = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
    for (const header of ['cache-control', 'expires', 'pragma']) {
      const value = supabaseResponse.headers.get(header);
      if (value) redirect.headers.set(header, value);
    }
    return redirect;
  }

  return supabaseResponse;
}
