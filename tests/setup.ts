import {beforeEach,afterAll} from 'vitest';
import {pool} from '../src/lib/db';
if(!process.env.DATABASE_URL || new URL(process.env.DATABASE_URL).pathname!='/linxiaobang_test')throw new Error('Refusing destructive tests outside linxiaobang_test');
beforeEach(async()=> { await pool.query('TRUNCATE users, login_attempts CASCADE'); });
afterAll(async()=>{await pool.end()});
