import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import ts from 'typescript';
mkdirSync('.sites-runtime/permissions',{recursive:true});
writeFileSync('.sites-runtime/permissions/mock.mjs',`export let identity=null;export let env={};export function setIdentity(v){identity=v;}export function setDB(v){env.DB=v;}export async function getChatGPTUser(){return identity;}`);
for(const [src,out] of [['lib/domain.ts','domain'],['lib/server.ts','server'],['app/api/workspace/route.ts','route']]){const code=ts.transpileModule(readFileSync(src,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll("'cloudflare:workers'","'./mock.mjs'").replaceAll("'@/app/chatgpt-auth'","'./mock.mjs'").replaceAll("'./domain'","'./domain.mjs'").replaceAll("'@/lib/domain'","'./domain.mjs'").replaceAll("'@/lib/server'","'./server.mjs'");writeFileSync(`.sites-runtime/permissions/${out}.mjs`,code);}
const {setIdentity,setDB}=await import('../.sites-runtime/permissions/mock.mjs');const {GET,POST}=await import('../.sites-runtime/permissions/route.mjs');const {todayColombo,cutoffDate}=await import('../.sites-runtime/permissions/domain.mjs');
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(readFileSync('drizzle/0000_cooing_tomas.sql','utf8'));
function statement(sql,args=[]){return {bind(...a){return statement(sql,a)},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:db.prepare(sql).run(...args)}}};}
setDB({prepare:statement,async batch(statements){db.exec('BEGIN');try{const out=[];for(const s of statements)out.push(await s.run());db.exec('COMMIT');return out;}catch(e){db.exec('ROLLBACK');throw e;}}});
for(const [id,role] of [['admin','Admin'],['manager','Manager'],['designer','Designer'],['staff','Staff'],['other','Designer']])db.prepare('INSERT INTO members(id,user_id,email,name,role,active,created_at) VALUES(?,?,?,?,?,1,?)').run(id,id,`${id}@test.test`,id,role,'now');db.exec("INSERT INTO companies(id,name) VALUES('co','Test Company')");
for(const [id,creator,date] of [['own','designer',todayColombo()],['old','designer','2020-01-01'],['edge','designer',cutoffDate()],['other-content','other',todayColombo()],['staff-content','staff',todayColombo()]])db.prepare('INSERT INTO content(id,company_id,title,publish_date,creator_id,created_at,updated_at,updated_by) VALUES(?,?,?,?,?,?,?,?)').run(id,'co',id,date,creator,'now','now','admin');
for(const [id,assignee] of [['task-own','staff'],['task-other','manager']])db.prepare('INSERT INTO tasks(id,title,due_date,assignee_id,updated_at,updated_by) VALUES(?,?,?,?,?,?)').run(id,id,todayColombo(),assignee,'now','admin');
function as(id){setIdentity(id?{userId:id,email:`${id}@test.test`,displayName:id}:null);}
async function post(action,data,origin='http://localhost'){return POST(new Request('http://localhost/api/workspace',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify({action,data})}));}
test('API authentication, scoping and role enforcement',async()=>{
 as(null);assert.equal((await GET()).status,401);
 as('designer');let res=await GET(),w=await res.json();assert.deepEqual(w.content.map(c=>c.id).sort(),['edge','own']);assert.equal(w.members.length,1);assert.equal(w.members[0].email,undefined);
 assert.equal((await post('company',{name:'Attack'})).status,403);
 assert.equal((await post('design',{id:'other-content',design_status:'Created',version:1})).status,403);
 assert.equal((await post('design',{id:'old',design_status:'Created',version:1})).status,403);
 assert.equal((await post('design',{id:'own',design_status:'Uploaded to Drive',version:1})).status,400);
 assert.equal((await post('design',{id:'own',design_status:'Created',version:1})).status,200);
 assert.equal((await post('design',{id:'own',design_status:'Uploaded to Drive',version:1})).status,409);
 assert.equal((await post('design',{id:'own',design_status:'Uploaded to Drive',version:2})).status,200);
 assert.equal(db.prepare("SELECT status FROM content WHERE id='own'").get().status,'Ready');
 assert.equal((await post('design',{id:'edge',design_status:'Created',version:1},'https://attacker.test')).status,403);
 as('staff');w=await (await GET()).json();assert.deepEqual(w.tasks.map(t=>t.id),['task-own']);assert.deepEqual(w.content.map(t=>t.id),['staff-content']);
 assert.equal((await post('task',{id:'task-other',status:'Completed',version:1})).status,403);
 assert.equal((await post('task',{id:'task-own',status:'Completed',version:1})).status,200);
 as('manager');assert.equal((await post('member',{name:'Bad',email:'bad@test.test',role:'Admin'})).status,403);
 as('admin');assert.equal((await post('member',{id:'designer',name:'designer',email:'designer@test.test',role:'Staff',active:1})).status,200);
 as('designer');w=await (await GET()).json();assert.equal(w.me.role,'Staff');assert.equal((await post('design',{id:'edge',design_status:'Created',version:1})).status,403);
 as('admin');assert.equal((await post('member',{id:'designer',name:'designer',email:'designer@test.test',role:'Staff',active:0})).status,200);
 as('designer');assert.equal((await GET()).status,403);
 as('unknown');assert.equal((await GET()).status,403);
});
test('company Excel imports are scoped, permission checked, atomic and idempotent',async()=>{
 const submit=(company,rows)=>POST(new Request('http://localhost/api/workspace',{method:'POST',headers:{origin:'http://localhost','Content-Type':'application/json'},body:JSON.stringify({action:'calendar_import',data:{company_id:company},rows})}));
 const row={company_id:'co',title:'Excel content',publish_date:todayColombo(),publish_time:'18:00',type:'Carousel',platform:'Instagram',notes:'All visible',creator_id:null,status:'Planned',priority:'Medium'};
 as('staff');assert.equal((await submit('co',[row])).status,403);
 as('manager');let res=await submit('co',[row]);assert.equal(res.status,200);assert.equal((await res.json()).inserted,1);
 res=await submit('co',[{...row,source_key:'a-fake-new-source',priority:'High'}]);assert.equal((await res.json()).skipped,1);
 db.exec("INSERT INTO companies(id,name) VALUES('co-two','Second Company')");
 const before=db.prepare('SELECT count(*) n FROM content').get().n;
 assert.equal((await submit('co',[{...row,title:'Not inserted'},{...row,company_id:'co-two'}])).status,400);
 assert.equal(db.prepare('SELECT count(*) n FROM content').get().n,before);
 assert.equal((await submit('co-two',[{...row,company_id:'co-two'}])).status,200);
 const made=db.prepare("SELECT * FROM content WHERE title='Excel content' AND company_id='co'").get();assert.equal(made.design_status,'Pending');
 assert.equal((await post('content',{...made,priority:'Urgent'})).status,200);assert.equal(db.prepare('SELECT priority FROM content WHERE id=?').get(made.id).priority,'Urgent');
 assert.equal(db.prepare('SELECT notes FROM content WHERE id=?').get(made.id).notes,'All visible');
});
