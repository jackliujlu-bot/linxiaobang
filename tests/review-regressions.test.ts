import {it,expect} from 'vitest';
import {randomUUID} from 'node:crypto';
import {actor,orderInput} from './helpers';
import {createOrder} from '../src/modules/orders/service';
import {actOnOrder} from '../src/modules/orders/actions';
import {reportOrder} from '../src/modules/moderation/service';
import {pool} from '../src/lib/db';
it('blocks completion if the requester reported before the order was claimed',async()=>{
 const owner=await actor(),helper=await actor(),o=await createOrder(owner,orderInput(),new Date());
 await reportOrder(owner,o.id,'接单前的参与者纠纷');
 await actOnOrder(helper,o.id,'CLAIM',randomUUID(),new Date());
 await actOnOrder(helper,o.id,'DELIVER',randomUUID(),new Date());
 await expect(actOnOrder(owner,o.id,'CONFIRM',randomUUID(),new Date())).rejects.toMatchObject({status:409});
});
it('checks the deadline after acquiring an order lock',async()=>{
 const owner=await actor(),helper=await actor(),now=new Date(),deadline=new Date(+now+1500),o=await createOrder(owner,{...orderInput(),deadlineAt:deadline.toISOString()},now);
 const holder=await pool.connect();await holder.query('BEGIN');await holder.query('SELECT id FROM orders WHERE id=$1 FOR UPDATE',[o.id]);
 const pending=actOnOrder(helper,o.id,'CLAIM',randomUUID(),new Date());
 const settled=pending.then(value=>({value}),error=>({error}));
 try{
  let waiting=false;
  for(let i=0;i<100;i++){
   const q=await pool.query("SELECT 1 FROM pg_stat_activity WHERE query='SELECT * FROM orders WHERE id=$1 FOR UPDATE' AND wait_event_type='Lock'");
   if(q.rowCount){waiting=true;break;}await new Promise(r=>setTimeout(r,10));
  }
  expect(waiting).toBe(true);expect(Date.now()).toBeLessThan(+deadline);
  await new Promise(r=>setTimeout(r,Math.max(0,+deadline-Date.now())+100));await holder.query('COMMIT');const result=await settled;expect(result).toHaveProperty('error.status',409);}
 finally{await holder.query('ROLLBACK');holder.release();}
});
it('does not purge private details when a report commits after cleanup snapshot starts',async()=>{
 const {vi}=await import('vitest');
 const owner=await actor(),o=await createOrder(owner,orderInput(),new Date());
 await actOnOrder(owner,o.id,'CANCEL',randomUUID(),new Date());
 await pool.query("UPDATE orders SET ended_at=now()-interval '8 days' WHERE id=$1",[o.id]);
 const barrier=await pool.connect(),observer=await pool.connect(),key=78341057;
 await barrier.query('SELECT pg_advisory_lock($1)',[key]);
 const originalConnect=pool.connect.bind(pool);
 const spy=vi.spyOn(pool,'connect').mockImplementation((async()=>{
  const client=await originalConnect();
  return new Proxy(client,{get(target,property){
   if(property==='query')return(text:any,params?:any)=>{
    if(typeof text==='string'&&text.includes("SELECT o.id FROM orders o WHERE o.status IN")){
     text="WITH maintenance_test_pause AS MATERIALIZED (SELECT pg_advisory_xact_lock("+key+")) "+text.replace('FROM orders o WHERE','FROM orders o CROSS JOIN maintenance_test_pause WHERE');
    }
    return target.query(text,params);
   };
   const v=Reflect.get(target,property);return typeof v==='function'?v.bind(target):v;
  }});
 }) as any);
 const {runMaintenance}=await import('../src/modules/maintenance/service');
 const pending=runMaintenance(new Date());
 try{
  let blocked=false;
  for(let i=0;i<100;i++){
   const r=await observer.query("SELECT 1 FROM pg_stat_activity WHERE query LIKE 'WITH maintenance_test_pause%' AND wait_event='advisory'");
   if(r.rowCount){blocked=true;break;}await new Promise(r=>setTimeout(r,10));
  }
  expect(blocked).toBe(true);
  await reportOrder(owner,o.id,'维护查询开始后提交的未决举报');
  await barrier.query('SELECT pg_advisory_unlock($1)',[key]);
  await pending;
  expect((await observer.query('SELECT details FROM order_private WHERE order_id=$1',[o.id])).rowCount).toBe(1);
 }finally{
  await barrier.query('SELECT pg_advisory_unlock($1)',[key]);
  await pending.catch(()=>{});spy.mockRestore();barrier.release();observer.release();
 }
});
it('returns a failing process exit code when one-shot maintenance cannot connect',async()=>{
 const {spawnSync}=await import('node:child_process');
 const child=spawnSync(process.execPath,['--import','tsx','scripts/maintenance.ts','--once'],{env:{...process.env,DATABASE_URL:'postgresql://invalid@127.0.0.1:1/invalid'},encoding:'utf8',timeout:10000});
 expect(child.stderr).toContain('Maintenance failed');
 expect(child.error).toBeUndefined();
 expect(child.status).toBe(1);
});
