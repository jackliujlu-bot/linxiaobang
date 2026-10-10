import type {Client} from '../../lib/db';
import {fail} from '../../lib/errors';
import type {Actor,OrderView} from '../../lib/contracts';
export async function readIdempotency(c:Client,actor:Actor,key:string,fingerprint:string):Promise<OrderView|undefined>{
 if(!/^[A-Za-z0-9_-]{8,128}$/.test(key))fail(400,'请求编号无效，请刷新重试');
 await c.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[actor.id+':'+key]);
 const prior=(await c.query('SELECT fingerprint,response FROM idempotency_requests WHERE actor_id=$1 AND request_id=$2',[actor.id,key])).rows[0];
 if(prior && prior.fingerprint!==fingerprint)fail(409,'同一请求编号不能用于不同操作');
 return prior?.response;
}
export async function saveIdempotency(c:Client,actor:Actor,key:string,fingerprint:string,response:OrderView){
 const {privateDetails:_private,...publicView}=response;
 await c.query('INSERT INTO idempotency_requests(actor_id,request_id,fingerprint,response) VALUES($1,$2,$3,$4)',[actor.id,key,fingerprint,publicView]);
}
