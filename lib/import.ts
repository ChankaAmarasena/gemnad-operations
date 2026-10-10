import { validDate,type Workspace } from './domain';
export function parseCSV(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('Unclosed quote in CSV.');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
export function importDate(raw:string){if(validDate(raw))return raw;const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];const match=raw.trim().match(/^(\d{1,2})[- /]([a-zA-Z]{3}|\d{1,2})[- /](\d{4})$/);if(!match)throw new Error(`Unrecognized date: ${raw}`);const month=/^\d/.test(match[2])?Number(match[2]):months.indexOf(match[2].toLowerCase())+1;const date=`${match[3]}-${String(month).padStart(2,'0')}-${match[1].padStart(2,'0')}`;if(!validDate(date))throw new Error(`Invalid date: ${raw}`);return date;}
export function prepareImport(csv:string,kind:string,sheet:string,companyId:string,workspace:Workspace){
 const rows=parseCSV(csv),header=rows.findIndex(r=>kind==='tasks'?r.includes('Job Detail'):r.includes('Assigned Creator')&&r.includes('Content'));
 if(header<0)throw new Error('Could not find the original company calendar or STAFF WORKS headers. Do not import a generated queue.');
 if(!sheet.trim()||/^(FOR DESIGN CONTENT|SYSTEM_SYNC|DASHBOARD)$/i.test(sheet.trim()))throw new Error('Use the original company tab name or STAFF WORKS.');
 const cols=rows[header],get=(row:string[],key:string)=>(row[cols.indexOf(key)]||'').trim(),out:any[]=[],errors:string[]=[];
 rows.slice(header+1).forEach((row,i)=>{const sourceRow=header+i+2,title=get(row,kind==='tasks'?'Job Detail':'Content');if(!title)return;
 try{const name=get(row,kind==='tasks'?'Employee':'Assigned Creator'),person=name?workspace.members.find(m=>m.active===1&&m.name.toLowerCase()===name.toLowerCase()):null;if(name&&!person)throw new Error(`Add an active team member named “${name}” first.`);
 const status=get(row,'Status')||(kind==='tasks'?'Pending':'Planned');const allowed=kind==='tasks'?['Pending','In Progress','Completed']:['Planned','In Progress','Ready','Published','On Hold'];if(!allowed.includes(status))throw new Error(`Map unknown status “${status}” in the CSV first.`);
 const priority=get(row,'Priority')||'Medium';if(!['Low','Medium','High','Urgent'].includes(priority))throw new Error(`Unknown priority “${priority}”.`);
 const source_key=`gemnad-operation:${sheet.trim().toUpperCase()}:${kind==='tasks'?(get(row,'JOB KEY')||sourceRow):sourceRow}`;
 out.push({source_key,title,creator_id:person?.id||null,status,priority,notes:get(row,kind==='tasks'?'Special Notes':'Notes'),...(kind==='tasks'?{due_date:importDate(get(row,'Complete Date')||get(row,'Date'))}:{company_id:companyId,publish_date:importDate(get(row,'Date')),publish_time:get(row,'Publishing Time'),type:get(row,'Content Type')||'Single Post',platform:get(row,'Platform')||'Instagram'})});
 }catch(e){errors.push(`Row ${sourceRow}: ${(e as Error).message}`);}});
 if(out.length>300)errors.push('This import has more than 300 records. Use a migration script with explicit original source keys for larger imports.');if(!out.length&&!errors.length)errors.push('No content records were found.');return {rows:out,errors};
}
