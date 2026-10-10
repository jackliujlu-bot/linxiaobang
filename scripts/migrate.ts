import {readdir,readFile} from 'node:fs/promises';
import pg from 'pg';
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
const client=await pool.connect();
try{
 await client.query('BEGIN');
 await client.query('SELECT pg_advisory_xact_lock(19761231)');
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of(await readdir('db/migrations')).filter(n=>n.endsWith('.sql')).sort()){
  if((await client.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name])).rowCount)continue;
  await client.query(await readFile('db/migrations/'+name,'utf8'));
  await client.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);
  console.log('Applied',name);
 }
 await client.query('COMMIT');
}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
