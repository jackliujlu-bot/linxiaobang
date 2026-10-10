/** Isolated real PostgreSQL for local development/tests. No global installs or OS changes. */
import EmbeddedPostgres from 'embedded-postgres';
import {mkdir,readFile,writeFile,access} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
await mkdir('.local',{recursive:true,mode:0o700});
const secretPath='.local/database-password';
let password:string;
try {password=(await readFile(secretPath,'utf8')).trim();}
catch {password=randomBytes(32).toString('hex');await writeFile(secretPath,password,{mode:0o600,flag:'wx'});}
const pg=new EmbeddedPostgres({databaseDir:'.local/postgres',user:'linxiaobang',password,port:55432,persistent:true,authMethod:'scram-sha-256',postgresFlags:['-h','127.0.0.1','-k',''],onLog:(m)=>{if(String(m).includes('FATAL'))console.error(String(m))},onError:(e)=>{if(String(e).includes('FATAL'))console.error('PostgreSQL startup failure. Check local environment.');}});
try {await access('.local/postgres/PG_VERSION');}catch {await pg.initialise();}
await pg.start();
const client=pg.getPgClient();await client.connect();
const existing=await client.query("SELECT 1 FROM pg_database WHERE datname='linxiaobang'");
if(!existing.rowCount)await pg.createDatabase('linxiaobang');
const tests=await client.query("SELECT 1 FROM pg_database WHERE datname='linxiaobang_test'");
if(!tests.rowCount)await pg.createDatabase('linxiaobang_test');
await client.end();
await writeFile('.local/env',`DATABASE_URL=postgresql://linxiaobang:${password}@127.0.0.1:55432/linxiaobang\nAPP_ORIGIN=http://127.0.0.1:3000\n`,{mode:0o600});
await writeFile('.local/test-env',`DATABASE_URL=postgresql://linxiaobang:${password}@127.0.0.1:55432/linxiaobang_test\nAPP_ORIGIN=http://127.0.0.1:3000\n`,{mode:0o600});
console.log('PostgreSQL ready on 127.0.0.1:55432. Local environment files created; credentials are never printed.');
let stopping=false;const stop=async()=>{if(stopping)return;stopping=true;await pg.stop();process.exit(0);};
process.on('SIGTERM',stop);process.on('SIGINT',stop);
setInterval(()=>{},60000);
