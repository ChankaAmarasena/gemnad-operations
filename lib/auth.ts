import { headers } from 'next/headers';

export type SessionUser = { userId: string; email: string; displayName: string };

// TEMPORARY: real sign-in (Auth.js) replaces this module. Until then, only a
// local development identity exists; production always reports "signed out".
// Never trust identity request headers: nothing on a self-hosted server strips them.
export async function getCurrentUser(): Promise<SessionUser | null> {
 await headers(); // keep this request dynamic, as a real session lookup will be
 const email = process.env.NODE_ENV === 'development' ? process.env.DEV_USER_EMAIL?.trim().toLowerCase() : undefined;
 return email ? { userId: 'dev:' + email, email, displayName: email } : null;
}

export function signInPath(returnTo = '/') { return '/api/auth/signin?callbackUrl=' + encodeURIComponent(safeReturn(returnTo)); }
export function signOutPath(returnTo = '/') { return '/api/auth/signout?callbackUrl=' + encodeURIComponent(safeReturn(returnTo)); }
function safeReturn(value: string) { return value.startsWith('/') && !value.startsWith('//') ? value : '/'; }
