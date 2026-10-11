import test from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {DatabaseSync} from 'node:sqlite';import {mkdtempSync,cpSync,appendFileSync,rmSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
const run=(env,folder)=>execFileSync(process.execPath,['scripts/migrate.mjs',folder],{env:{...process.env,...env},encoding:'utf8'});
test('migrations apply once, in order, and reject edited files',()=>{
 const dir=mkdtempSync(join(tmpdir(),'gemnad-migrate-')),folder=join(dir,'drizzle'),DATABASE_PATH=join(dir,'app.db');
 try{
  cpSync('drizzle',folder,{recursive:true});
  assert.match(run({DATABASE_PATH},folder),/2 migration\(s\) applied/);
  assert.match(run({DATABASE_PATH},folder),/up to date/);
  const db=new DatabaseSync(DATABASE_PATH);assert.deepEqual(db.prepare('SELECT name FROM _migrations ORDER BY name').all().map(r=>r.name),['0000_cooing_tomas.sql','0001_member_access.sql']);
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE type='trigger'").all().length>0);db.close();
  appendFileSync(join(folder,'0001_member_access.sql'),'\n-- edited');
  assert.throws(()=>run({DATABASE_PATH},folder),/was changed after it was applied/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
