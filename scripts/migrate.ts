import pg from 'pg';
import {migrate} from '../src/lib/migrations';
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
try{await client.connect();await migrate(client);console.log('Database migrations are up to date.');}finally{await client.end();}
