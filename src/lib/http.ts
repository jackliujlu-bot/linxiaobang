import {z} from 'zod';
import {AppError,fail} from './errors';
import {requireActor} from '../modules/auth/service';
export const COOKIE='linxiaobang_session';
export function assertMutation(req:Request):void{
 const expected=process.env.APP_ORIGIN||'http://127.0.0.1:3000';
 if(req.headers.get('origin')!==expected || req.headers.get('x-csrf')!=='1' || !req.headers.get('content-type')?.startsWith('application/json'))fail(403,'请求来源校验失败，请从本机页面重试');
}
export function token(req:Request):string{return req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1)||'';}
export const actorFrom=(req:Request)=>requireActor(token(req));
export async function body(req:Request):Promise<unknown>{
 if(Number(req.headers.get('content-length'))>16384)fail(413,'提交内容过长');
 const value=await req.text();if(value.length>16384)fail(413,'提交内容过长');
 try{return JSON.parse(value);}catch{fail(400,'请求格式不正确');}
}
export function errorResponse(error:unknown):Response{
 if(error instanceof AppError)return json({error:error.message},error.status);
 if(error instanceof z.ZodError)return json({error:'请检查填写内容'},400);
 return json({error:'服务暂时不可用，请稍后重试'},500);
}
export const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
export async function route(fn:()=>Promise<Response>):Promise<Response>{try{return await fn();}catch(e){return errorResponse(e);}}
export function validId(id:string):string{if(!z.string().uuid().safeParse(id).success)fail(400,'无效编号');return id;}
export function sessionCookie(value:string,maxAge=604800):string{
 const secure=(process.env.APP_ORIGIN||'').startsWith('https:')?'; Secure':'';
 return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure}`;
}
