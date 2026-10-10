import { validDate, statuses, priorities, type Workspace } from './domain';
import { importDate, parseCSV } from './import';
export type GridCell=string|number|Date|null;
export type ImportSheet={name:string;rows:GridCell[][];date1904?:boolean};
export const importFields=[['title','Content'],['publish_date','Publish date'],['publish_time','Publish time'],['notes','Special note'],['type','Content type'],['platform','Platform'],['creator_id','Creator (optional)'],['status','Status (optional)'],['priority','Priority (optional)']] as const;
export type Mapping=Record<string,number>;
const aliases:Record<string,string[]>={title:['content','content idea','content title','title','idea','topic','post','post idea'],publish_date:['date','publish date','publishing date','publication date','scheduled date'],publish_time:['time','publish time','publishing time','scheduled time'],notes:['notes','note','special note','special notes','caption','description'],type:['content type','type','format','post type'],platform:['platform','platforms','channel'],creator_id:['assigned creator','creator','assigned to','assignee'],status:['status','content status'],priority:['priority']};
const normalize=(v:unknown)=>String(v??'').trim().toLowerCase().replace(/[_\-]/g,' ').replace(/\s+/g,' ');
export function detectColumns(rows:GridCell[][]){let best=-1,header=-1,mapping:Mapping={};for(let i=0;i<Math.min(rows.length,60);i++){const m:Mapping={};for(const [field,names] of Object.entries(aliases))m[field]=rows[i].findIndex(c=>names.includes(normalize(c)));const score=Object.values(m).filter(v=>v>=0).length;if(m.title>=0&&m.publish_date>=0&&score>best){best=score;header=i;mapping=m;}}return {header,mapping:header>=0?mapping:Object.fromEntries(importFields.map(([f])=>[f,-1]))};}
export function excelDate(value:GridCell,date1904=false){if(value instanceof Date)return value.toISOString().slice(0,10);if(typeof value==='number'){if(!Number.isFinite(value)||value<1||value>100000)throw new Error('Invalid Excel date.');const date=new Date(Date.UTC(date1904?1904:1899,date1904?0:11,date1904?1:30)+Math.floor(value)*86400000).toISOString().slice(0,10);if(!validDate(date))throw new Error('Invalid Excel date.');return date;}return importDate(String(value??'').trim());}
export function excelTime(value:GridCell){if(value===null||value==='')return '';if(value instanceof Date)return value.toISOString().slice(11,16);if(typeof value==='number'){const minutes=Math.round((value%1)*1440)%1440;return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}const s=String(value).trim(),m=s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(am|pm)?$/i);if(!m)throw new Error(`Invalid time “${s}”; use 18:30 or 6:30 pm.`);let h=Number(m[1]),min=Number(m[2]);if(min>59||h>(m[3]?12:23)||(m[3]&&h<1))throw new Error(`Invalid time “${s}”.`);if(m[3])h=(h%12)+(m[3].toLowerCase()==='pm'?12:0);return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;}
function plain(v:GridCell){return v===null?'':v instanceof Date?v.toISOString():String(v).trim();}
export function contentIdentity(r:any){return JSON.stringify([r.company_id,r.title.trim(),r.publish_date,r.publish_time.trim(),r.type.trim(),r.platform.trim()]);}
export async function planRows(sheet:ImportSheet,header:number,mapping:Mapping,companyId:string,ws:Workspace){
 const rows:any[]=[],errors:string[]=[],warnings:string[]=[];let duplicates=0;const seen=new Set(ws.content.map(contentIdentity));
 if(mapping.title<0||mapping.publish_date<0)throw new Error('Map the Content and Publish date columns first.');
 for(let i=header+1;i<sheet.rows.length;i++){
 const source=sheet.rows[i],get=(field:string)=>source[mapping[field]]??null,title=plain(get('title'));if(!title)continue;
 try{
 const name=plain(get('creator_id'));const people=name?ws.members.filter(m=>m.active===1&&(normalize(m.name)===normalize(name)||normalize(m.email)===normalize(name))):[];
 if(name&&people.length!==1)warnings.push(`Row ${i+1}: “${name}” was left Unassigned. Choose a creator in the list.`);
 const rawStatus=plain(get('status')),status=statuses.find(s=>normalize(s)===normalize(rawStatus))||(normalize(rawStatus)==='pending'?'Planned':'Planned');
 if(rawStatus&&!statuses.some(s=>normalize(s)===normalize(rawStatus))&&normalize(rawStatus)!=='pending')warnings.push(`Row ${i+1}: status “${rawStatus}” defaults to Planned.`);
 const rawPriority=plain(get('priority')),priority=priorities.find(s=>normalize(s)===normalize(rawPriority))||'Medium';if(rawPriority&&!priorities.some(s=>normalize(s)===normalize(rawPriority)))warnings.push(`Row ${i+1}: priority “${rawPriority}” defaults to Medium.`);
 const row={company_id:companyId,title,publish_date:excelDate(get('publish_date'),sheet.date1904),publish_time:excelTime(get('publish_time')),notes:plain(get('notes')),type:plain(get('type'))||'Single Post',platform:plain(get('platform'))||'Instagram',creator_id:people.length===1?people[0].id:null,status,priority};
 if(title.length>500||row.notes.length>10000||row.type.length>80||row.platform.length>100)throw new Error('A text field exceeds its supported length.');
 const identity=contentIdentity(row);if(seen.has(identity)){duplicates++;continue;}seen.add(identity);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(identity)))).map(n=>n.toString(16).padStart(2,'0')).join('');
 rows.push({...row,source_key:`calendar:${companyId}:${hash}`});
 }catch(e){errors.push(`Row ${i+1}: ${(e as Error).message}`);}
 }
 if(rows.length>300)errors.push('Choose a sheet with no more than 300 new content items.');
 return {rows,errors,warnings,duplicates};
}
function value(cell:any):GridCell{const v=cell.value;if(v==null)return null;if(v instanceof Date||typeof v==='number'||typeof v==='string')return v;if(v.richText)return v.richText.map((x:any)=>x.text).join('');if(v.formula||v.sharedFormula){if(v.result==null)throw new Error('A formula has no saved result. Recalculate and save the workbook in Excel first.');return value({value:v.result});}if(v.text)return v.text;if(v.error)throw new Error(`Excel cell error: ${v.error}`);return String(v);}
export async function readPlanFile(file:File):Promise<ImportSheet[]>{
 if(file.size>5*1024*1024)throw new Error('Choose a file smaller than 5 MB.');
 if(/\.csv$/i.test(file.name))return [{name:file.name.replace(/\.csv$/i,''),rows:parseCSV(await file.text())}];
 if(!/\.xlsx$/i.test(file.name))throw new Error('Choose an Excel .xlsx file. Save older .xls files as .xlsx first.');
 const {default:ExcelJS}=await import('exceljs');const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(await file.arrayBuffer());
 return workbook.worksheets.filter(s=>s.state!=='veryHidden'&&s.state!=='hidden').map(sheet=>{if(sheet.rowCount>10000||sheet.columnCount>100)throw new Error('The workbook is too large. Use a content plan with up to 10,000 rows and 100 columns.');const rows:GridCell[][]=[];for(let i=1;i<=sheet.rowCount;i++){const row:GridCell[]=[];for(let j=1;j<=sheet.columnCount;j++)row.push(value(sheet.getCell(i,j)));rows.push(row);}return {name:sheet.name,rows,date1904:workbook.properties.date1904};});
}
