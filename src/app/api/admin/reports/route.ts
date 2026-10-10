import {listReports} from '../../../../modules/moderation/service';
import {actorFrom,json,route} from '../../../../lib/http';
export async function GET(req:Request){return route(async()=>json(await listReports(await actorFrom(req))));}
