import pg from 'pg';
import {readFile,writeFile} from 'node:fs/promises';
import {randomBytes,createHash} from 'node:crypto';
import {migrate,migrationNames} from '../../lib/migrations';
const TABLES=['communities','users','sessions','login_attempts','orders','order_private','order_events','idempotency_requests','cancel_requests','reports','audit_events'] as const;
type Row=Record<string,unknown>;
type Snapshot={format:1;migrations:string[];tables:Record<string,Row[]>};
function canonical(value:unknown):string{
 if(value instanceof Date)return JSON.stringify(value.toISOString());
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical((value as Row)[k])).join(',')+'}';
 return JSON.stringify(value);
}
const digest=(rows:Row[])=>createHash('sha256').update(rows.map(canonical).sort().join('\n')).digest('hex');
export async function backup(connectionString:string,path:string):Promise<void>{
 const c=new pg.Client({connectionString});await c.connect();
 try{
  await c.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const snapshot:Snapshot={format:1,migrations:(await c.query('SELECT name FROM schema_migrations ORDER BY name')).rows.map(r=>r.name),tables:{}};
  for(const table of TABLES)snapshot.tables[table]=(await c.query('SELECT * FROM "'+table+'"')).rows;
  await c.query('COMMIT');await writeFile(path,JSON.stringify(snapshot),{flag:'wx',mode:0o600});
 }finally{await c.end();}
}
export async function restoreForTest(connectionString:string,path:string):Promise<{database:string;rows:number;verified:true}>{
 const snapshot=JSON.parse(await readFile(path,'utf8')) as Snapshot;
 const expected=await migrationNames();
 if(snapshot.format!==1||JSON.stringify(snapshot.migrations)!==JSON.stringify(expected)||!snapshot.tables||Object.keys(snapshot.tables).length!==TABLES.length||TABLES.some(t=>!Array.isArray(snapshot.tables[t])))throw new Error('备份格式或迁移版本不匹配');
 const database='linxiaobang_restore_'+randomBytes(8).toString('hex');
 const adminUrl=new URL(connectionString);adminUrl.pathname='/postgres';
 const admin=new pg.Client({connectionString:adminUrl.toString()});await admin.connect();
 let created=false,target:pg.Client|undefined;let rows=0;
 try{
  // Database identifier is generated here, never accepted from input. Existing databases are never targets.
  await admin.query('CREATE DATABASE "'+database+'"');created=true;
  const url=new URL(connectionString);url.pathname='/'+database;target=new pg.Client({connectionString:url.toString()});await target.connect();await migrate(target);
  await target.query('BEGIN');
  for(const table of TABLES){
   const columns=(await target.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table])).rows.map(r=>r.column_name as string);
   for(const row of snapshot.tables[table]){
    if(!row||typeof row!=='object'||columns.some(k=>!(k in row))||Object.keys(row).length!==columns.length)throw new Error('备份行与表结构不匹配');
    await target.query('INSERT INTO "'+table+'"('+columns.map(k=>'"'+k+'"').join(',')+') VALUES('+columns.map((_,i)=>'$'+(i+1)).join(',')+')',columns.map(k=>row[k]));
    rows++;
   }
  }
  await target.query('COMMIT');
  for(const table of TABLES)if(digest((await target.query('SELECT * FROM "'+table+'"')).rows)!==digest(snapshot.tables[table]))throw new Error('恢复验证失败：'+table);
  return{database,rows,verified:true};
 }finally{
  if(target)await target.end();
  try{if(created)await admin.query('DROP DATABASE "'+database+'"');}finally{await admin.end();}
 }
}
