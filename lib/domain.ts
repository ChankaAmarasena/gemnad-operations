export const roles = ['Admin','Manager','Designer','Staff'] as const;
export const statuses = ['Planned','In Progress','Ready','Published','On Hold'] as const;
export const designStatuses = ['Pending','Created','Uploaded to Drive'] as const;
export const priorities = ['Low','Medium','High','Urgent'] as const;
export function todayColombo(now = new Date()) {return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function cutoffDate(today = todayColombo()) { const d=new Date(today+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-5);return d.toISOString().slice(0,10); }
export function validDate(s:string){ return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s; }
export function canManage(role:string){return role==='Admin'||role==='Manager';}
export function eligibleDesign(item:any, member:any, today=todayColombo()){return !!member&&member.active===1&&member.role==='Designer'&&item.publish_date>=cutoffDate(today);}
export function nextDesignStatus(current:string,next:string){return next===current||designStatuses.indexOf(next as any)===designStatuses.indexOf(current as any)+1;}
export function safeUrl(value:string){if(!value)return true;try {const u=new URL(value);return u.protocol==='https:';}catch{return false;}}
export type Member={id:string;user_id:string|null;email:string;name:string;role:typeof roles[number];active:number};
export type Company={id:string;name:string;color:string;drive_url:string;active:number};
export type Content={id:string;company_id:string;title:string;publish_date:string;publish_time:string;type:string;platform:string;status:string;design_status:string;creator_id:string|null;priority:string;notes:string;drive_url:string;source_key:string|null;version:number;updated_at:string};
export type Task={id:string;title:string;due_date:string;assignee_id:string|null;status:string;priority:string;notes:string;version:number};
export type Event={id:number;actor_id:string;entity_type:string;entity_id:string;action:string;detail:string;created_at:string};
export type Workspace={me:Member;members:Member[];companies:Company[];content:Content[];tasks:Task[];activity:Event[];today:string;cutoff:string};
