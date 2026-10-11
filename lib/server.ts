import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { canManage,cutoffDate,todayColombo,hasSection,companyAccess,calendarAccess,type Member } from './domain';
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
 const manage=canManage(me.role),sql=db(),args:any[]=[];
 // Scope every database read. Calendar grants are independent of personal queue grants.
 const scopes:string[]=[];
 if(hasSection(me,'Content calendar')||hasSection(me,'Companies')||hasSection(me,'Overview')){
 if(me.role==='Admin'||me.all_companies===1)scopes.push('1=1');
 else {const ids=JSON.parse(me.company_ids||'[]');if(ids.length){scopes.push(`c.company_id IN (${ids.map(()=>'?').join(',')})`);args.push(...ids);}}
 }
 if(hasSection(me,'Design queue')){scopes.push(`c.publish_date>=? AND EXISTS(SELECT 1 FROM members m WHERE m.id=c.creator_id AND m.active=1 AND m.role='Designer')${manage?'':' AND c.creator_id=?'}`);args.push(cutoffDate());if(!manage)args.push(me.id);}
 const scope=scopes.length?scopes.map(s=>'('+s+')').join(' OR '):'0=1';
 const content=await sql.prepare(`SELECT c.* FROM content c WHERE ${scope} ORDER BY c.publish_date,c.title`).bind(...args).all<any>();
 const companyIds=[...new Set(content.results.map(c=>c.company_id))];
 const permitted=(hasSection(me,'Content calendar')||hasSection(me,'Companies')||hasSection(me,'Overview'))?JSON.parse(me.company_ids||'[]'):[];for(const id of permitted)if(!companyIds.includes(id))companyIds.push(id);
 const allCompanies=me.role==='Admin'||(me.all_companies===1&&(hasSection(me,'Content calendar')||hasSection(me,'Companies')||hasSection(me,'Overview')));
 const [tasks,companies,members,activity]=await Promise.all([
 sql.prepare(`SELECT * FROM tasks WHERE ${hasSection(me,'Staff queue')?(manage?'1=1':'assignee_id=?'):'0=1'} ORDER BY due_date`).bind(...(hasSection(me,'Staff queue')&&!manage?[me.id]:[])).all(),
 sql.prepare(`SELECT * FROM companies WHERE ${allCompanies?'1=1':companyIds.length?`id IN (${companyIds.map(()=>'?').join(',')})`:'0=1'} ORDER BY name`).bind(...(allCompanies?[]:companyIds)).all(),
 sql.prepare(me.role==='Admin'?'SELECT * FROM members ORDER BY name':`SELECT id,name,role,active FROM members WHERE id=? OR id IN (SELECT c.creator_id FROM content c WHERE ${scope})`).bind(...(me.role==='Admin'?[]:[me.id,...args])).all(),
 sql.prepare(`SELECT * FROM activity WHERE ${hasSection(me,'Activity')?(me.role==='Admin'?'1=1':'actor_id=?'):'0=1'} ORDER BY id DESC LIMIT 250`).bind(...(hasSection(me,'Activity')&&me.role!=='Admin'?[me.id]:[])).all()
 ]);
 // Managers need active creator choices but never other members' account/access details.
 if(manage&&me.role!=='Admin'){const list=await sql.prepare('SELECT id,name,role,active FROM members ORDER BY name').all();members.results=list.results;}
 return {me,content:content.results,tasks:tasks.results,companies:companies.results,members:members.results,activity:activity.results,today:todayColombo(),cutoff:cutoffDate()};
}
