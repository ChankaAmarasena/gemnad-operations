import { getCurrentUser } from '@/lib/auth';
import { SignInButton } from './auth-buttons';
import WorkspaceApp from './workspace';
export const dynamic='force-dynamic';
const errors:Record<string,string>={AccessDenied:'That Google account could not be verified. Use your verified work Google account.'};
export default async function Page({searchParams}:{searchParams:Promise<{error?:string}>}){const user=await getCurrentUser();if(!user){const {error}=await searchParams;return <main className="login"><div className="login-card"><div className="brand-symbol">g</div><div className="eyebrow">GEMNAD OPERATIONS</div><h1>Great work.<br/>Beautifully organised.</h1><p>One home for your brands, content and creative team.</p>{error&&<p className="error-text">{errors[error]||'Sign-in did not complete. Please try again.'}</p>}<SignInButton/><small>Access is limited to your authorised Gemnad account.</small></div><div className="login-art"><div className="orbit one"/><div className="orbit two"/><span>Make room<br/>for your<br/><em>next big idea.</em></span></div></main>;}return <WorkspaceApp/>;}
