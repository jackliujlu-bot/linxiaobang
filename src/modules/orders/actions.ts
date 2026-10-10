import {randomUUID} from 'node:crypto';
import {transaction,type Client} from '../../lib/db';
import {fail} from '../../lib/errors';
import {lockedOrder,orderView} from './service';
import type {Actor,OrderView} from '../../lib/contracts';
import {readIdempotency,saveIdempotency} from './idempotency';
export async function actOnOrder(actor:Actor,id:string,action:'CLAIM'|'DELIVER'|'CONFIRM'|'CANCEL',requestId:string,now:Date):Promise<OrderView>{
 return transaction(async c=>{
  const fingerprint=id+':'+action,prior=await readIdempotency(c,actor,requestId,fingerprint);
  if(prior)return prior;
  const o=await lockedOrder(c,id);
  // Recompute from source records under the shared order lock, including reports
  // submitted before the first claim. Never settle from a stale cached flag.
  const disputed=Boolean((await c.query("SELECT 1 FROM reports WHERE order_id=$1 AND participant AND status='OPEN' LIMIT 1",[id])).rowCount);
  let status:string=o.status,sim=o.sim_status,assignee=o.assignee_id,end:Date|null=null;
  if(action==='CLAIM'){
   if(actor.id===o.requester_id)fail(403,'不能领取自己发布的任务');
   const lockTime=(await c.query('SELECT GREATEST($1::timestamptz,clock_timestamp()) AS time',[now])).rows[0].time;
   if(o.status!=='OPEN'||+o.deadline_at<=+lockTime)fail(409,'任务已被领取或已过期，请刷新');
   status='CLAIMED';assignee=actor.id;
  }else if(action==='DELIVER'){
   if(actor.id!==o.assignee_id)fail(403,'只有接单者可以标记送达');
   if(o.status!=='CLAIMED')fail(409,'任务状态已变化，请刷新');
   status='DELIVERED';
  }else if(action==='CONFIRM'){
   if(actor.id!==o.requester_id)fail(403,'只有发布者可以确认完成');
   if(o.status!=='DELIVERED'||disputed)fail(409,'任务尚未送达或仍有未解决纠纷');
   status='COMPLETED';sim='SETTLED';end=now;
  }else if(action==='CANCEL'){
   if(actor.id!==o.requester_id)fail(403,'只有发布者可以直接取消');
   if(o.status!=='OPEN')fail(409,'已接单任务需要对方同意取消');
   status='CANCELLED';sim='REFUNDED';end=now;
  }else fail(400,'未知操作');
  const result=(await c.query('UPDATE orders SET status=$2,sim_status=$3,assignee_id=$4,ended_at=$5,dispute_open=$7 WHERE id=$1 AND status=$6 RETURNING *',[id,status,sim,assignee,end,o.status,disputed&&['CLAIMED','DELIVERED'].includes(status)])).rows[0];
  if(!result)fail(409,'状态已变化');
  await c.query('INSERT INTO order_events(id,order_id,actor_id,action,created_at) VALUES($1,$2,$3,$4,$5)',[randomUUID(),id,actor.id,action,now]);
  const view=orderView(result);await saveIdempotency(c,actor,requestId,fingerprint,view);return view;
 });
}
