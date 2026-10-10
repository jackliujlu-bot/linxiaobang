import {createOrder,listOrders} from '../../../modules/orders/service';
import {actorFrom,assertMutation,body,json,route} from '../../../lib/http';
import {z} from 'zod';
import type {CreateOrderInput} from '../../../lib/contracts';
export async function GET(req:Request){return route(async()=>{
 const actor=await actorFrom(req),params=new URL(req.url).searchParams;
 const category=z.enum(['MEAL','TRASH']).optional().parse(params.get('category')||undefined);
 const orders=await listOrders(actor,{category,scope:params.get('scope')==='mine'?'mine':'hall'},new Date());
 return json(orders);
});}
export async function POST(req:Request){return route(async()=>{assertMutation(req);const actor=await actorFrom(req);return json(await createOrder(actor,await body(req) as CreateOrderInput,new Date(),req.headers.get('x-request-id')||undefined),201);});}
