import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import ts from 'typescript';
mkdirSync('.test-build/permissions',{recursive:true});
writeFileSync('.test-build/permissions/mock.mjs',`export let identity=null;let db=null;export function setIdentity(v){identity=v;}export function setDB(v){db=v;}export function database(){return db;}export async function getCurrentUser(){return identity;}`);
for(const [src,out] of [['lib/domain.ts','domain'],['lib/sqlite-d1.ts','sqlite-d1'],['lib/server.ts','server'],['app/api/workspace/route.ts','route']]){const code=ts.transpileModule(readFileSync(src,'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replaceAll("'./auth'","'./mock.mjs'").replaceAll("'./database'","'./mock.mjs'").replaceAll("'./domain'","'./domain.mjs'").replaceAll("'@/lib/domain'","'./domain.mjs'").replaceAll("'@/lib/server'","'./server.mjs'");writeFileSync(`.test-build/permissions/${out}.mjs`,code);}
const {setIdentity,setDB}=await import('../.test-build/permissions/mock.mjs');const {GET,POST}=await import('../.test-build/permissions/route.mjs');const {todayColombo,cutoffDate}=await import('../.test-build/permissions/domain.mjs');const {wrapDatabase}=await import('../.test-build/permissions/sqlite-d1.mjs');
const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.exec(readFileSync('drizzle/0000_cooing_tomas.sql','utf8'));db.exec(readFileSync('drizzle/0001_member_access.sql','utf8'));
setDB(wrapDatabase(db));
for(const [id,role] of [['admin','Admin'],['manager','Manager'],['designer','Designer'],['staff','Staff'],['other','Designer']])db.prepare('INSERT INTO members(id,user_id,email,name,role,active,created_at) VALUES(?,?,?,?,?,1,?)').run(id,id,`${id}@test.test`,id,role,'now');db.exec("UPDATE members SET all_companies=1 WHERE role IN ('Admin','Manager');INSERT INTO companies(id,name) VALUES('co','Test Company')");
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
 as('staff');w=await (await GET()).json();assert.deepEqual(w.tasks.map(t=>t.id),['task-own']);assert.deepEqual(w.content.map(t=>t.id),[]);
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

test('section and company grants control server reads, writes and personal queues',async()=>{
 as('admin');
 let res=await post('member',{id:'designer',name:'designer',email:'designer@test.test',role:'Designer',active:1,sections:['Design queue','Content calendar'],all_companies:0,company_ids:['co-two']});assert.equal(res.status,200);
 as('designer');let w=await (await GET()).json();assert.deepEqual(w.me.sections,'["Design queue","Content calendar"]');
 assert.ok(w.content.some(c=>c.company_id==='co-two'));assert.ok(w.content.some(c=>c.id==='own'));assert.ok(!w.content.some(c=>c.id==='other-content'));assert.ok(!w.content.some(c=>c.id==='old'));
 assert.equal((await post('content',{...w.content[0],title:'Unauthorized edit'})).status,403);
 as('admin');assert.equal((await post('member',{id:'designer',name:'designer',email:'designer@test.test',role:'Designer',active:1,sections:['Content calendar'],all_companies:0,company_ids:['co-two']})).status,200);
 as('designer');w=await (await GET()).json();assert.ok(w.content.every(c=>c.company_id==='co-two'));assert.equal((await post('design',{id:'edge',design_status:'Created',version:1})).status,403);
 as('admin');assert.equal((await post('member',{id:'manager',name:'manager',email:'manager@test.test',role:'Manager',active:1,sections:['Content calendar'],all_companies:0,company_ids:['co-two']})).status,200);
 as('manager');w=await (await GET()).json();assert.ok(w.content.every(c=>c.company_id==='co-two'));assert.equal(w.tasks.length,0);assert.equal(w.activity.length,0);
 const forbidden=db.prepare("SELECT * FROM content WHERE id='staff-content'").get();assert.equal((await post('content',{...forbidden,title:'Blocked'})).status,403);
 const permitted=w.content[0];assert.equal((await post('content',{...permitted,title:'Allowed manager edit'})).status,200);
 assert.equal((await post('company',{id:'co-two',name:'No section'})).status,403);
 as('admin');assert.equal((await post('design',{id:'staff-content',design_status:'Created',version:1})).status,403);
 assert.equal((await post('member',{id:'manager',name:'manager',email:'manager@test.test',role:'Manager',sections:['Team'],all_companies:1,company_ids:[]})).status,400);
 assert.equal((await post('member',{id:'manager',name:'manager',email:'manager@test.test',role:'Manager',sections:['Content calendar'],all_companies:1,company_ids:[]})).status,200);
 db.exec("INSERT INTO companies(id,name) VALUES('future','Future Company')");as('manager');w=await (await GET()).json();assert.ok(w.companies.some(c=>c.id==='future'));
});
test('creator reassignment enters and leaves the design queue without duplicate content',async()=>{
 as('admin');await post('member',{id:'designer',name:'designer',email:'designer@test.test',role:'Designer',active:1,sections:['Design queue'],all_companies:0,company_ids:[]});
 const before=db.prepare('SELECT count(*) n FROM content').get().n;
 let item=db.prepare("SELECT * FROM content WHERE id='staff-content'").get();assert.equal((await post('content',{...item,creator_id:'designer'})).status,200);
 as('designer');let w=await (await GET()).json();assert.ok(w.content.some(c=>c.id===item.id));
 as('admin');item=db.prepare("SELECT * FROM content WHERE id='staff-content'").get();assert.equal((await post('content',{...item,creator_id:'admin'})).status,200);
 as('designer');w=await (await GET()).json();assert.ok(!w.content.some(c=>c.id===item.id));assert.equal(db.prepare('SELECT count(*) n FROM content').get().n,before);
});
