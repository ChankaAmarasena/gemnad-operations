import { getServerSession, type NextAuthOptions } from 'next-auth';
import GoogleProvider, { type GoogleProfile } from 'next-auth/providers/google';

export type SessionUser = { userId: string; email: string; displayName: string };

// Auth.js reads NEXTAUTH_URL; APP_URL is the one public-address setting we document.
if (!process.env.NEXTAUTH_URL && process.env.APP_URL) process.env.NEXTAUTH_URL = process.env.APP_URL;

// Google proves who someone is; access is decided by the members table on every
// API request (lib/server.ts), so deactivation and role changes apply immediately.
export const authOptions: NextAuthOptions = {
 providers: [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID || '', clientSecret: process.env.GOOGLE_CLIENT_SECRET || '' })],
 session: { strategy: 'jwt', maxAge: 7 * 24 * 60 * 60 },
 pages: { signIn: '/', error: '/' },
 callbacks: {
  signIn: ({ account, profile }) => account?.provider === 'google' && (profile as GoogleProfile | undefined)?.email_verified === true,
  session: ({ session, token }) => ({ ...session, googleId: token.sub }),
 },
};

export async function getCurrentUser(): Promise<SessionUser | null> {
 // Local development only: skip Google with a fixed identity.
 const devEmail = process.env.NODE_ENV === 'development' ? process.env.DEV_USER_EMAIL?.trim().toLowerCase() : undefined;
 if (devEmail) return { userId: 'dev:' + devEmail, email: devEmail, displayName: devEmail };
 const session = await getServerSession(authOptions) as { googleId?: string; user?: { email?: string | null; name?: string | null } } | null;
 const email = session?.user?.email?.trim().toLowerCase();
 if (!session?.googleId || !email) return null;
 return { userId: 'google:' + session.googleId, email, displayName: session.user?.name || email };
}
