import {randomBytes,randomUUID,createHash} from 'node:crypto';
import argon2 from 'argon2';
import {z} from 'zod';
import {pool,transaction} from '../../lib/db';
import {fail} from '../../lib/errors';
import type {Actor} from '../../lib/contracts';
const username=z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/);
const password=z.string().min(12).max(128);
const options={type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1} as const;
const hashToken=(token:string)=>createHash('sha256').update(token).digest('hex');
let dummy:Promise<string>|undefined;
export async function registerUser(input:{username:string,password:string,adultConfirmed:boolean},now:Date):Promise<Actor>{
 const parsed=z.object({username,password,adultConfirmed:z.literal(true)}).safeParse(input);
 if(!parsed.success)fail(400,'请确认已满18岁，用户名为3–32位小写字母、数字或下划线，密码为12–128位');
 const id=randomUUID(),hash=await argon2.hash(parsed.data.password,options);
 try{await pool.query('INSERT INTO users(id,username,password_hash,adult_confirmed_at,created_at) VALUES($1,$2,$3,$4,$4)',[id,parsed.data.username,hash,now]);}
 catch(e){if((e as {code?:string}).code==='23505')fail(409,'用户名已被使用');throw e;}
 return{id,role:'USER'};
}
export async function login(input:{username:string,password:string},now:Date):Promise<{actor:Actor,sessionToken:string}>{
 const parsed=z.object({username,password:z.string().min(1).max(128)}).safeParse(input);
 if(!parsed.success)fail(401,'用户名或密码不正确');
 const result=await transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['login:'+parsed.data.username]);
  const attempts=(await c.query('SELECT * FROM login_attempts WHERE username=$1',[parsed.data.username])).rows[0];
  if(attempts && +now-+attempts.window_start<15*60000 && attempts.failures>=5)return{error:429 as const};
  const user=(await c.query('SELECT id,role,password_hash FROM users WHERE username=$1',[parsed.data.username])).rows[0];
  dummy??=argon2.hash(randomBytes(32),options);
  const valid=await argon2.verify(user?.password_hash ?? await dummy,parsed.data.password);
  if(!user || !valid){
   await c.query(`INSERT INTO login_attempts(username,failures,window_start) VALUES($1,1,$2)
    ON CONFLICT(username) DO UPDATE SET failures=CASE WHEN login_attempts.window_start <= $2::timestamptz-interval '15 minutes' THEN 1 ELSE login_attempts.failures+1 END,
    window_start=CASE WHEN login_attempts.window_start <= $2::timestamptz-interval '15 minutes' THEN $2 ELSE login_attempts.window_start END`,[parsed.data.username,now]);
   return{error:401 as const};
  }
  await c.query('DELETE FROM login_attempts WHERE username=$1',[parsed.data.username]);
  const sessionToken=randomBytes(32).toString('hex');
  await c.query('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,$3)',[hashToken(sessionToken),user.id,new Date(+now+7*86400000)]);
  return{actor:{id:user.id,role:user.role} as Actor,sessionToken};
 });
 if('error' in result)fail(result.error!,result.error===429?'尝试次数过多，请15分钟后再试':'用户名或密码不正确');
 return result;
}
export async function requireActor(sessionToken:string):Promise<Actor>{
 if(!/^[a-f0-9]{64}$/.test(sessionToken))fail(401,'请先登录');
 const row=(await pool.query('SELECT u.id,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[hashToken(sessionToken)])).rows[0];
 if(!row)fail(401,'登录已过期，请重新登录');return row;
}
export async function logout(sessionToken:string):Promise<void>{await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(sessionToken)]);}
