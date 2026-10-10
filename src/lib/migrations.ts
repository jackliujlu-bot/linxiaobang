import {readdir,readFile} from 'node:fs/promises';
import type {PoolClient,Client} from 'pg';
export async function migrationNames(){return(await readdir('db/migrations')).filter(n=>n.endsWith('.sql')).sort();}
export async function migrate(c:PoolClient|Client){
 await c.query('BEGIN');
 try{
  await c.query('SELECT pg_advisory_xact_lock(19761231)');
  await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for(const name of await migrationNames()){
   if((await c.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rowCount)continue;
   await c.query(await readFile('db/migrations/'+name,'utf8'));
   await c.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);
  }await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}
}
