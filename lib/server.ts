import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManage,cutoffDate,todayColombo,type Member } from './domain';
export function db(){if(!env.DB)throw new Error('Database is not configured');return env.DB;}
export class HttpError extends Error {constructor(public status:number,message:string){super(message);}}
export async function currentMember(){
 const identity=await getChatGPTUser();if(!identity)throw new HttpError(401,'Please sign in to continue.');
 const sql=db(),email=identity.email.toLowerCase();
 let me=await sql.prepare('SELECT * FROM members WHERE user_id=?').bind(identity.userId).first<Member>();
 if(!me){
 // Initial publication is owner-private. The only permitted first visitor is the owner.
 // This atomic claim is closed permanently once any member exists.
 await sql.prepare("INSERT INTO members (id,user_id,email,name,role,active,created_at) SELECT ?,?,?,?,'Admin',1,? WHERE NOT EXISTS (SELECT 1 FROM members)").bind(crypto.randomUUID(),identity.userId,email,identity.displayName,new Date().toISOString()).run();
 await sql.prepare('UPDATE members SET user_id=? WHERE email=? AND user_id IS NULL AND active=1').bind(identity.userId,email).run();
 me=await sql.prepare('SELECT * FROM members WHERE user_id=?').bind(identity.userId).first<Member>();
 }
 if(!me||!me.active)throw new HttpError(403,'Your account does not have active Gemnad access. Contact your administrator.');return me;
}
export async function workspace(me:Member){
 const manage=canManage(me.role),sql=db();
 const scope=manage?'1=1':me.role==='Designer'?"c.creator_id=? AND c.publish_date>=? AND EXISTS (SELECT 1 FROM members m WHERE m.id=c.creator_id AND m.role='Designer' AND m.active=1)":'c.creator_id=?';
 const args=manage?[]:me.role==='Designer'?[me.id,cutoffDate()]:[me.id];
 const [content,tasks,companies,members,activity]=await Promise.all([
 sql.prepare(`SELECT c.* FROM content c WHERE ${scope} ORDER BY c.publish_date,c.title`).bind(...args).all(),
 sql.prepare(`SELECT * FROM tasks WHERE ${manage?'1=1':'assignee_id=?'} ORDER BY due_date`).bind(...(manage?[]:[me.id])).all(),
 sql.prepare(`SELECT * FROM companies ${manage?'':`WHERE id IN (SELECT c.company_id FROM content c WHERE ${scope})`} ORDER BY name`).bind(...args).all(),
 sql.prepare(manage?'SELECT * FROM members ORDER BY name':'SELECT id,name,role,active FROM members WHERE id=?').bind(...(manage?[]:[me.id])).all(),
 sql.prepare('SELECT * FROM activity '+(manage?'':'WHERE actor_id=?')+' ORDER BY id DESC LIMIT 250').bind(...(manage?[]:[me.id])).all()
 ]);return {me,content:content.results,tasks:tasks.results,companies:companies.results,members:members.results,activity:activity.results,today:todayColombo(),cutoff:cutoffDate()};
}
