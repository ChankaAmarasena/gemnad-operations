import { currentMember,db,HttpError,workspace } from '@/lib/server';
import { canManage,hasSection,companyAccess,calendarAccess,sections,roles,statuses,designStatuses,priorities,validDate,safeUrl,eligibleDesign,nextDesignStatus } from '@/lib/domain';
export const dynamic='force-dynamic';
function reply(body:any,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store'}});}
function fail(e:unknown){if(e instanceof HttpError)return reply({error:e.message},e.status);console.error(e);return reply({error:'The request could not be saved. Refresh and try again.'},500);}
export async function GET(){try{return reply(await workspace(await currentMember()));}catch(e){return fail(e);}}
function requireValue(test:unknown,message:string){if(!test)throw new HttpError(400,message);}
function str(v:any,max=500){requireValue(typeof v==='string'&&v.length<=max,'Invalid text value.');return v.trim();}
function choice(v:any,list:readonly string[]){requireValue(list.includes(v),'Invalid status or role.');return v;}
function date(v:any){requireValue(typeof v==='string'&&validDate(v),'Enter a valid date.');return v;}
function url(v:any){const s=str(v||'',2000);requireValue(safeUrl(s),'Links must use https://');return s;}
export async function POST(req:Request){try{
 const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)throw new HttpError(403,'Request origin is not allowed.');
 if(Number(req.headers.get('content-length')||0)>1000000)throw new HttpError(413,'Request is too large.');
 const me=await currentMember(),sql=db(),manage=canManage(me.role),body:any=await req.json(),action=body.action,data=body.data||{},now=new Date().toISOString();
 const admin=()=>{if(me.role!=='Admin')throw new HttpError(403,'Only an administrator can manage team access.');};
 const section=(name:string)=>{if(!hasSection(me,name))throw new HttpError(403,'This section is not assigned to your account.');};
 const companyPermission=(id:string)=>{if(!companyAccess(me,id))throw new HttpError(403,'This company is not assigned to your account.');};
 const manager=()=>{if(!manage)throw new HttpError(403,'This action requires an administrator or manager.');};
 const audit=(kind:string,id:string,event:string,detail:string)=>sql.prepare('INSERT INTO activity(actor_id,entity_type,entity_id,action,detail,created_at) VALUES(?,?,?,?,?,?)').bind(me.id,kind,id,event,detail,now);
 async function assignee(id:any){if(!id)return null;const m=await sql.prepare('SELECT * FROM members WHERE id=? AND active=1').bind(str(id)).first();requireValue(m,'Select an active team member.');return id;}
 if(action==='company'){
 manager();section('Companies');if(data.id)companyPermission(data.id);else if(me.role!=='Admin'&&me.all_companies!==1)throw new HttpError(403,'Only administrators or managers with all companies can add a company.');const id=data.id||crypto.randomUUID(),name=str(data.name,120);requireValue(name,'Company name is required.');const color=str(data.color||'#7951d3');requireValue(/^#[0-9a-f]{6}$/i.test(color),'Invalid company color.');
 await sql.batch([sql.prepare('INSERT INTO companies(id,name,color,drive_url,active) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,color=excluded.color,drive_url=excluded.drive_url,active=excluded.active').bind(id,name,color,url(data.drive_url),data.active===0?0:1),audit('company',id,data.id?'Updated':'Created',name)]);
 }else if(action==='member'){
 admin();const id=data.id||crypto.randomUUID(),name=str(data.name,120),email=str(data.email,250).toLowerCase(),role=choice(data.role,roles),active=data.active===0?0:1;
 requireValue(name&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),'Enter a name and valid email.');
 const old=await sql.prepare('SELECT * FROM members WHERE id=?').bind(id).first();
 if(old?.user_id)requireValue(email===old.email,'The email of a signed-in member cannot be changed.');
 if(id===me.id)requireValue(active===1&&role==='Admin','Keep your own administrator access active.');
 let assignedSections=data.sections===undefined?(old?.sections||null):data.sections;
 if(Array.isArray(assignedSections)){requireValue(assignedSections.every((s:any)=>sections.includes(s)&&(!['Team','Migration'].includes(s)||role==='Admin')),'Invalid section assignment.');assignedSections=JSON.stringify([...new Set(assignedSections)]);}else requireValue(assignedSections===null||data.sections===undefined,'Select valid sections.');
 const allCompanies=data.all_companies===undefined?(old?.all_companies??(role==='Admin'||role==='Manager'?1:0)):(data.all_companies===1?1:0);
 let companyIds=data.company_ids===undefined?JSON.parse(String(old?.company_ids||'[]')):data.company_ids;
 requireValue(Array.isArray(companyIds)&&companyIds.length<=300,'Invalid companies.');companyIds=[...new Set(companyIds)];
 for(const companyId of companyIds){requireValue(await sql.prepare('SELECT id FROM companies WHERE id=?').bind(str(companyId)).first(),'Assigned company was not found.');}
 await sql.batch([sql.prepare('INSERT INTO members(id,email,name,role,active,created_at,sections,all_companies,company_ids) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET email=excluded.email,name=excluded.name,role=excluded.role,active=excluded.active,sections=excluded.sections,all_companies=excluded.all_companies,company_ids=excluded.company_ids').bind(id,email,name,role,active,now,assignedSections,allCompanies,JSON.stringify(companyIds)),audit('member',id,old?'Updated':'Added',`${name} · ${role} · ${active?'Active':'Inactive'}`)]);
 }else if(action==='content'){
 manager();section('Content calendar');companyPermission(data.company_id);const id=data.id||crypto.randomUUID(),title=str(data.title,500);requireValue(title,'Content title is required.');
 const old=await sql.prepare('SELECT * FROM content WHERE id=?').bind(id).first<any>();
 if(old)companyPermission(old.company_id);
 const company=await sql.prepare('SELECT id FROM companies WHERE id=? AND active=1').bind(str(data.company_id)).first();requireValue(company,'Select an active company.');
 const values=[str(data.company_id),title,date(data.publish_date),str(data.publish_time||'',30),str(data.type||'Single Post',80),str(data.platform||'Instagram',100),choice(data.status||'Planned',statuses),await assignee(data.creator_id),choice(data.priority||'Medium',priorities),str(data.notes||'',10000),url(data.drive_url),now,me.id];
 if(old){requireValue(Number.isInteger(data.version),'Missing record version.');const result=await sql.prepare('UPDATE content SET company_id=?,title=?,publish_date=?,publish_time=?,type=?,platform=?,status=?,creator_id=?,priority=?,notes=?,drive_url=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=?').bind(...values,id,data.version).run();if(!result.meta.changes)throw new HttpError(409,'Someone edited this content. Refresh before saving.');}
 else await sql.prepare("INSERT INTO content(company_id,title,publish_date,publish_time,type,platform,status,creator_id,priority,notes,drive_url,updated_at,updated_by,id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(...values,id,now).run();
 }else if(action==='design'){
 section('Design queue');
 const old=await sql.prepare('SELECT * FROM content WHERE id=?').bind(str(data.id)).first<any>();if(!old)throw new HttpError(404,'Content not found.');
 const creator=old.creator_id?await sql.prepare('SELECT * FROM members WHERE id=?').bind(old.creator_id).first():null;
 if(!eligibleDesign(old,creator)||(!manage&&(me.role!=='Designer'||old.creator_id!==me.id)))throw new HttpError(403,'This item is outside your design queue.');
 const next=choice(data.design_status,designStatuses);requireValue(nextDesignStatus(old.design_status,next),'Move design status forward one step at a time.');
 const result=await sql.prepare("UPDATE content SET design_status=?,status=CASE WHEN ?='Uploaded to Drive' AND design_status<>'Uploaded to Drive' THEN 'Ready' ELSE status END,drive_url=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=?").bind(next,next,url(data.drive_url??old.drive_url),now,me.id,old.id,data.version).run();if(!result.meta.changes)throw new HttpError(409,'This item changed. Refresh before saving.');
 }else if(action==='task'){
 section('Staff queue');
 const old=data.id?await sql.prepare('SELECT * FROM tasks WHERE id=?').bind(str(data.id)).first<any>():null;
 if(!manage){if(!old||old.assignee_id!==me.id)throw new HttpError(403,'You can only update your own staff tasks.');
 const result=await sql.prepare('UPDATE tasks SET status=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=?').bind(choice(data.status,['Pending','In Progress','Completed']),now,me.id,old.id,data.version).run();if(!result.meta.changes)throw new HttpError(409,'This task changed. Refresh before saving.');
 }else{
 const id=old?.id||crypto.randomUUID(),title=str(data.title,500);requireValue(title,'Task title is required.');const values=[title,date(data.due_date),await assignee(data.assignee_id),choice(data.status||'Pending',['Pending','In Progress','Completed']),choice(data.priority||'Medium',priorities),str(data.notes||'',10000),now,me.id];
 if(old){const result=await sql.prepare('UPDATE tasks SET title=?,due_date=?,assignee_id=?,status=?,priority=?,notes=?,updated_at=?,updated_by=?,version=version+1 WHERE id=? AND version=?').bind(...values,id,data.version).run();if(!result.meta.changes)throw new HttpError(409,'This task changed. Refresh before saving.');}
 else await sql.prepare('INSERT INTO tasks(title,due_date,assignee_id,status,priority,notes,updated_at,updated_by,id) VALUES(?,?,?,?,?,?,?,?,?)').bind(...values,id).run();
 }
 }else if(action==='import'||action==='calendar_import'){
 const calendarImport=action==='calendar_import';
 if(calendarImport){manager();section('Content calendar');companyPermission(data.company_id);requireValue(body.kind!=='tasks','This import accepts company content only.');const co=await sql.prepare('SELECT id FROM companies WHERE id=? AND active=1').bind(str(data.company_id)).first();requireValue(co,'Select an active company.');}else admin();const rows=body.rows;requireValue(Array.isArray(rows)&&rows.length>0&&rows.length<=300,'Import between 1 and 300 rows at a time.');
 const statements=[];for(const r of rows){
 let key=calendarImport?'':str(r.source_key,300);if(!calendarImport)requireValue(key,'Every row needs a stable source key.');
 const title=str(r.title,500);requireValue(title,'Every row needs a title.');
 const creator=await assignee(r.creator_id);const id=crypto.randomUUID();
 if(body.kind==='tasks')statements.push(sql.prepare('INSERT INTO tasks(id,title,due_date,assignee_id,status,priority,notes,source_key,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_key) DO NOTHING').bind(id,title,date(r.due_date),creator,choice(r.status,['Pending','In Progress','Completed']),choice(r.priority,priorities),str(r.notes||'',10000),key,now,me.id));
 else{
 const co=await sql.prepare('SELECT id FROM companies WHERE id=? AND active=1').bind(str(r.company_id)).first();requireValue(co,'Company not found.');
 if(calendarImport){requireValue(r.company_id===data.company_id,'Every row must belong to the selected company.');const identity=JSON.stringify([r.company_id,title,date(r.publish_date),str(r.publish_time||'',30),str(r.type||'Single Post',80),str(r.platform||'Instagram',100)]);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)))).map(n=>n.toString(16).padStart(2,'0')).join('');key=`calendar:${r.company_id}:${hash}`;}
 statements.push(sql.prepare('INSERT INTO content(id,company_id,title,publish_date,publish_time,type,platform,status,creator_id,priority,notes,source_key,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(source_key) DO NOTHING').bind(id,r.company_id,title,date(r.publish_date),str(r.publish_time||'',30),str(r.type||'Single Post',80),str(r.platform||'Instagram',100),choice(r.status,statuses),creator,choice(r.priority,priorities),str(r.notes||'',10000),key,now,now,me.id));
 }
 }
 const result=await sql.batch(statements);return reply({inserted:result.reduce((n,r)=>n+(r.meta.changes?1:0),0),skipped:result.filter(r=>!r.meta.changes).length});
 }else throw new HttpError(400,'Unknown action.');
 return reply({ok:true});
 }catch(e){return fail(e);}}
