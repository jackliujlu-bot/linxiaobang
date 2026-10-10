import {z} from 'zod';
import {viewReportDetails,resolveReport} from '../../../../../modules/moderation/service';
import {actorFrom,assertMutation,body,json,route,validId} from '../../../../../lib/http';
type Ctx={params:Promise<{id:string}>};
export async function GET(req:Request,ctx:Ctx){return route(async()=>json(await viewReportDetails(await actorFrom(req),validId((await ctx.params).id))));}
export async function POST(req:Request,ctx:Ctx){return route(async()=>{
 assertMutation(req);const actor=await actorFrom(req),input=z.object({result:z.enum(['DISMISS','CANCEL','COMPLETE']),reason:z.string()}).parse(await body(req));
 await resolveReport(actor,validId((await ctx.params).id),input.result,input.reason);return json({ok:true});
});}
