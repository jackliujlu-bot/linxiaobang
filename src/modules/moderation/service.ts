import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {pool,transaction,type Client} from '../../lib/db';
import {fail} from '../../lib/errors';
import type {Actor,OrderView} from '../../lib/contracts';
import {lockedOrder,orderView} from '../orders/service';
const reasonText=(s:string)=>{const r=z.string().trim().min(1).max(300).safeParse(s);if(!r.success)fail(400,'请填写1–300字的原因');return r.data;};
export function requireAdmin(a:Actor){if(a.role!=='ADMIN')fail(403,'需要管理员权限');}
async function refreshDispute(c:Client,id:string){
 await c.query(`UPDATE orders SET dispute_open=(status IN ('CLAIMED','DELIVERED') AND EXISTS(SELECT 1 FROM reports WHERE order_id=$1 AND status='OPEN' AND participant)) WHERE id=$1`,[id]);
}
export async function requestCancellation(actor:Actor,id:string,reason:string):Promise<string>{
 const text=reasonText(reason);
 return transaction(async c=>{
  const o=await lockedOrder(c,id);
  if(actor.id!==o.requester_id&&actor.id!==o.assignee_id)fail(403,'只有订单双方可以申请取消');
  if(!['CLAIMED','DELIVERED'].includes(o.status))fail(409,'当前状态不能协商取消');
  if((await c.query("SELECT 1 FROM cancel_requests WHERE order_id=$1 AND status='OPEN'",[id])).rowCount)fail(409,'已有待回应的取消申请');
  const requestId=randomUUID();await c.query("INSERT INTO cancel_requests(id,order_id,requester_id,reason,status) VALUES($1,$2,$3,$4,'OPEN')",[requestId,id,actor.id,text]);return requestId;
 });
}
export async function respondCancellation(actor:Actor,requestId:string,accept:boolean):Promise<OrderView>{
 if(typeof accept!=='boolean')fail(400,'回应格式错误');
 return transaction(async c=>{
  const initial=(await c.query('SELECT order_id FROM cancel_requests WHERE id=$1',[requestId])).rows[0];if(!initial)fail(404,'申请不存在');
  const o=await lockedOrder(c,initial.order_id);
  const r=(await c.query('SELECT * FROM cancel_requests WHERE id=$1 FOR UPDATE',[requestId])).rows[0];
  if(actor.id===r.requester_id || ![o.requester_id,o.assignee_id].includes(actor.id))fail(403,'只有另一方可以回应');
  if(r.status!=='OPEN'||!['CLAIMED','DELIVERED'].includes(o.status))fail(409,'申请或任务状态已变化');
  await c.query('UPDATE cancel_requests SET status=$2 WHERE id=$1',[requestId,accept?'ACCEPTED':'REJECTED']);
  if(accept){
   const updated=(await c.query("UPDATE orders SET status='CANCELLED',sim_status='REFUNDED',ended_at=now(),dispute_open=false WHERE id=$1 RETURNING *",[o.id])).rows[0];
   await c.query("INSERT INTO order_events(id,order_id,actor_id,action,created_at) VALUES($1,$2,$3,'CANCEL_AGREED',now())",[randomUUID(),o.id,actor.id]);return orderView(updated);
  }return orderView(o);
 });
}
export async function reportOrder(actor:Actor,id:string,reason:string):Promise<string>{
 const text=reasonText(reason);return transaction(async c=>{
  const o=await lockedOrder(c,id),participant=[o.requester_id,o.assignee_id].includes(actor.id);
  const existing=(await c.query("SELECT id FROM reports WHERE order_id=$1 AND reporter_id=$2 AND status='OPEN'",[id,actor.id])).rows[0];if(existing)return existing.id;
  const reportId=randomUUID();await c.query('INSERT INTO reports(id,order_id,reporter_id,reason,participant) VALUES($1,$2,$3,$4,$5)',[reportId,id,actor.id,text,participant]);
  await refreshDispute(c,id);return reportId;
 });
}
export async function viewReportDetails(admin:Actor,reportId:string):Promise<OrderView>{
 requireAdmin(admin);return transaction(async c=>{
  const r=(await c.query('SELECT order_id FROM reports WHERE id=$1',[reportId])).rows[0];if(!r)fail(404,'举报不存在');
  const o=await lockedOrder(c,r.order_id);
  await c.query("INSERT INTO audit_events(id,admin_id,report_id,action) VALUES($1,$2,$3,'VIEW')",[randomUUID(),admin.id,reportId]);
  const p=(await c.query('SELECT details FROM order_private WHERE order_id=$1',[o.id])).rows[0];
  return{...orderView(o),...(p?{privateDetails:p.details}:{})};
 });
}
export async function resolveReport(admin:Actor,reportId:string,result:'DISMISS'|'CANCEL'|'COMPLETE',reason:string):Promise<void>{
 requireAdmin(admin);const text=reasonText(reason);if(!['DISMISS','CANCEL','COMPLETE'].includes(result))fail(400,'处理结果无效');
 await transaction(async c=>{
  const initial=(await c.query('SELECT order_id FROM reports WHERE id=$1',[reportId])).rows[0];if(!initial)fail(404,'举报不存在');
  const o=await lockedOrder(c,initial.order_id),r=(await c.query('SELECT * FROM reports WHERE id=$1 FOR UPDATE',[reportId])).rows[0];
  if(r.status!=='OPEN')fail(409,'举报已处理');
  if(result==='CANCEL'&&!['OPEN','CLAIMED','DELIVERED'].includes(o.status))fail(409,'结束订单不能改写模拟结算');
  if(result==='COMPLETE'){
   if(o.status!=='DELIVERED')fail(409,'只能完成已送达任务');
   if((await c.query("SELECT 1 FROM reports WHERE order_id=$1 AND id<>$2 AND participant AND status='OPEN'",[o.id,reportId])).rowCount)fail(409,'其他双方纠纷尚未解决');
  }
  await c.query("UPDATE reports SET status='RESOLVED',result=$2,resolution_reason=$3,resolved_at=now() WHERE id=$1",[reportId,result,text]);
  if(result!=='DISMISS'){
   await c.query('UPDATE orders SET status=$2,sim_status=$3,ended_at=now() WHERE id=$1',[o.id,result==='CANCEL'?'CANCELLED':'COMPLETED',result==='CANCEL'?'REFUNDED':'SETTLED']);
   await c.query("UPDATE cancel_requests SET status='CLOSED' WHERE order_id=$1 AND status='OPEN'",[o.id]);
   await c.query('INSERT INTO order_events(id,order_id,actor_id,action,created_at) VALUES($1,$2,$3,$4,now())',[randomUUID(),o.id,admin.id,'ADMIN_'+result]);
  }
  await refreshDispute(c,o.id);
  await c.query('INSERT INTO audit_events(id,admin_id,report_id,action,reason) VALUES($1,$2,$3,$4,$5)',[randomUUID(),admin.id,reportId,result,text]);
 });
}
export async function listReports(admin:Actor){requireAdmin(admin);return(await pool.query("SELECT id,order_id,reason,participant,status,created_at FROM reports ORDER BY (status='OPEN') DESC,created_at DESC LIMIT 200")).rows;}
export async function cancellationFor(actor:Actor,id:string){
 const o=(await pool.query('SELECT requester_id,assignee_id FROM orders WHERE id=$1',[id])).rows[0];if(!o)fail(404,'任务不存在');
 if(![o.requester_id,o.assignee_id].includes(actor.id))return null;
 return(await pool.query("SELECT id,requester_id,reason FROM cancel_requests WHERE order_id=$1 AND status='OPEN'",[id])).rows[0]||null;
}
