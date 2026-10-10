import {registerUser,login,logout} from '../../../../modules/auth/service';
import {actorFrom,assertMutation,body,json,route,sessionCookie,token} from '../../../../lib/http';
import {pool} from '../../../../lib/db';
import {fail} from '../../../../lib/errors';
type Context={params:Promise<{action:string}>};
export async function GET(req:Request,{params}:Context){return route(async()=>{
 if((await params).action!=='me')fail(404,'未找到接口');
 const actor=await actorFrom(req);const user=(await pool.query('SELECT username FROM users WHERE id=$1',[actor.id])).rows[0];
 return json({...actor,username:user.username});
});}
export async function POST(req:Request,{params}:Context){return route(async()=>{
 assertMutation(req);const {action}=await params;const input=await body(req);
 if(action==='logout'){await logout(token(req));const res=json({ok:true});res.headers.set('Set-Cookie',sessionCookie('',0));return res;}
 if(action==='register')await registerUser(input as Parameters<typeof registerUser>[0],new Date());
 else if(action!=='login')fail(404,'未找到接口');
 const result=await login(input as Parameters<typeof login>[0],new Date());const res=json({actor:result.actor});
 res.headers.set('Set-Cookie',sessionCookie(result.sessionToken));return res;
});}
