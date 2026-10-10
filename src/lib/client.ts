'use client';
import {useEffect,useState} from 'react';
import type {Actor,OrderStatus} from './contracts';
export class ClientError extends Error{constructor(message:string,public status:number){super(message);}}
export async function api<T>(path:string,method='GET',data?:unknown,requestId?:string):Promise<T>{
 let response:Response;try{response=await fetch(path,{method,cache:'no-store',headers:method==='GET'?{}:{'content-type':'application/json','x-csrf':'1',...(requestId?{'x-request-id':requestId}:{})},body:data===undefined?undefined:JSON.stringify(data)});}catch{throw new ClientError('网络连接失败，请重试。重复提交不会重复结算。',0);}
 const result=await response.json();if(!response.ok)throw new ClientError(result.error||'操作失败，请重试',response.status);return result;
}
export type User=Actor&{username:string};
export function useSession(){
 const [user,setUser]=useState<User|null>(null),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;api<User>('/api/auth/me').then(u=>{if(active)setUser(u);}).catch(()=>{}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[]);
 return{user,setUser,loading};
}
export const statusLabel:Record<OrderStatus,string>={OPEN:'待接单',CLAIMED:'进行中',DELIVERED:'待确认',COMPLETED:'已完成',CANCELLED:'已取消',EXPIRED:'已过期'};
export const categoryLabel={MEAL:'取餐',TRASH:'倒垃圾'};
export const dateText=(s:string)=>new Date(s).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false});
