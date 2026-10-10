import {z} from 'zod';
import {requestCancellation,respondCancellation,reportOrder,cancellationFor} from '../../../../../modules/moderation/service';
import {actorFrom,assertMutation,body,json,route,validId} from '../../../../../lib/http';
type Ctx={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Ctx){return route(async()=>json(await cancellationFor(await actorFrom(req),validId((await ctx.params).id))));}
export async function POST(req:Request,ctx:Ctx){return route(async()=>{
 assertMutation(req);const actor=await actorFrom(req),id=validId((await ctx.params).id);
 const d=z.discriminatedUnion('action',[z.object({action:z.literal('REQUEST_CANCEL'),reason:z.string()}),z.object({action:z.literal('REPORT'),reason:z.string()}),z.object({action:z.literal('RESPOND_CANCEL'),requestId:z.string().uuid(),accept:z.boolean()})]).parse(await body(req));
 if(d.action==='RESPOND_CANCEL'){
  const current=await cancellationFor(actor,id);
  if(!current||current.id!==d.requestId)return json({error:'申请与任务不匹配'},409);
  return json(await respondCancellation(actor,d.requestId,d.accept));
 }
 return json({id:await(d.action==='REPORT'?reportOrder:requestCancellation)(actor,id,d.reason)});
});}
