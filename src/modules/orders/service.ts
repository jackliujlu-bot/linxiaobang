import {randomUUID,createHash} from 'node:crypto';
import {z} from 'zod';
import {pool,transaction,type Client} from '../../lib/db';
import {fail} from '../../lib/errors';
import type {Actor,CreateOrderInput,OrderView} from '../../lib/contracts';
import {readIdempotency,saveIdempotency} from './idempotency';
export const orderSchema=z.object({
 category:z.enum(['MEAL','TRASH']),pickupArea:z.string().trim().min(1).max(50),
 dropoffArea:z.string().trim().min(1).max(50),deadlineAt:z.string().datetime({offset:true}),
 bountyCents:z.union([z.literal(200),z.literal(300)]),privateDetails:z.string().trim().min(1).max(300)
});
export function orderView(r:Record<string,any>):OrderView{
 return{id:r.id,category:r.category,pickupArea:r.pickup_area,dropoffArea:r.dropoff_area,deadlineAt:new Date(r.deadline_at).toISOString(),bountyCents:r.bounty_cents,status:r.status,simStatus:r.sim_status,requesterId:r.requester_id,assigneeId:r.assignee_id,disputeOpen:r.dispute_open};
}
export async function createOrder(actor:Actor,input:CreateOrderInput,now:Date,requestId?:string):Promise<OrderView>{
 const p=orderSchema.safeParse(input);
 if(!p.success)fail(400,'请检查任务内容、2/3元金额和未来截止时间');
 const d=p.data;
 return transaction(async c=>{
  const fingerprint='CREATE:'+createHash('sha256').update(JSON.stringify(d)).digest('hex');
  if(requestId){const prior=await readIdempotency(c,actor,requestId,fingerprint);if(prior)return prior;}
  if(+new Date(d.deadlineAt)<=+now)fail(400,'截止时间必须在未来');
  const r=(await c.query(`INSERT INTO orders(id,category,pickup_area,dropoff_area,deadline_at,bounty_cents,status,sim_status,requester_id,created_at) VALUES($1,$2,$3,$4,$5,$6,'OPEN','HELD',$7,$8) RETURNING *`,[randomUUID(),d.category,d.pickupArea,d.dropoffArea,d.deadlineAt,d.bountyCents,actor.id,now])).rows[0];
  await c.query('INSERT INTO order_private(order_id,details) VALUES($1,$2)',[r.id,d.privateDetails]);
  const view=orderView(r);if(requestId)await saveIdempotency(c,actor,requestId,fingerprint,view);
  return {...view,privateDetails:d.privateDetails};
 });
}
export async function listOrders(_actor:Actor,filter:{category?:'MEAL'|'TRASH'},_now:Date):Promise<OrderView[]>{
 return(await pool.query('SELECT * FROM orders WHERE ($1::text IS NULL OR category=$1) ORDER BY created_at DESC LIMIT 200',[filter.category??null])).rows.map(orderView);
}
export async function getOrder(actor:Actor,id:string,_now:Date):Promise<OrderView>{
 const r=(await pool.query(`SELECT o.*, CASE WHEN o.requester_id=$2 OR (o.assignee_id=$2 AND o.status IN ('CLAIMED','DELIVERED','COMPLETED')) THEN p.details END AS authorized_details FROM orders o LEFT JOIN order_private p ON p.order_id=o.id WHERE o.id=$1`,[id,actor.id])).rows[0];
 if(!r)fail(404,'任务不存在');
 const result=orderView(r);if(r.authorized_details!==null && r.authorized_details!==undefined)result.privateDetails=r.authorized_details;return result;
}
export async function lockedOrder(c:Client,id:string){
 const r=(await c.query('SELECT * FROM orders WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!r)fail(404,'任务不存在');return r;
}
