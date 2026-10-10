import {getOrder} from '../../../../modules/orders/service';
import {actorFrom,json,route,validId} from '../../../../lib/http';
export async function GET(req:Request,ctx:{params:Promise<{id:string}>}){return route(async()=>json(await getOrder(await actorFrom(req),validId((await ctx.params).id),new Date())));}
