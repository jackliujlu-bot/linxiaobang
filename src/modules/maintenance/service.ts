import {randomUUID} from 'node:crypto';
import {transaction} from '../../lib/db';
export async function runMaintenance(now:Date):Promise<{expired:number,purged:number}>{
 return transaction(async c=>{
  const due=(await c.query("SELECT id FROM orders WHERE status='OPEN' AND deadline_at <= $1 ORDER BY id FOR UPDATE SKIP LOCKED",[now])).rows;
  for(const {id} of due){
   await c.query("UPDATE orders SET status='EXPIRED',sim_status='REFUNDED',ended_at=$2,dispute_open=false WHERE id=$1",[id,now]);
   await c.query("INSERT INTO order_events(id,order_id,action,created_at) VALUES($1,$2,'EXPIRE',$3)",[randomUUID(),id,now]);
  }
  const eligible=(await c.query(`SELECT o.id FROM orders o WHERE o.status IN ('COMPLETED','CANCELLED','EXPIRED')
   AND o.ended_at <= $1::timestamptz-interval '7 days'
   AND EXISTS(SELECT 1 FROM order_private p WHERE p.order_id=o.id)
   AND NOT EXISTS(SELECT 1 FROM reports r WHERE r.order_id=o.id AND r.status='OPEN')
   ORDER BY o.id FOR UPDATE OF o SKIP LOCKED`,[now])).rows;
  let purged=0;
  for(const {id} of eligible)purged+=(await c.query('DELETE FROM order_private WHERE order_id=$1',[id])).rowCount||0;
  await c.query('DELETE FROM sessions WHERE expires_at <= $1',[now]);
  await c.query("DELETE FROM login_attempts WHERE window_start <= $1::timestamptz-interval '15 minutes'",[now]);
  return{expired:due.length,purged};
 });
}
