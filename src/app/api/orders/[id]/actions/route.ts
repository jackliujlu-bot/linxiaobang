import {z} from 'zod';
import {actOnOrder} from '../../../../../modules/orders/actions';
import {actorFrom,assertMutation,body,json,route,validId} from '../../../../../lib/http';
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}){return route(async()=>{
 assertMutation(req);const actor=await actorFrom(req),input=z.object({action:z.enum(['CLAIM','DELIVER','CONFIRM','CANCEL']),requestId:z.string()}).parse(await body(req));
 return json(await actOnOrder(actor,validId((await ctx.params).id),input.action,input.requestId,new Date()));
});}
