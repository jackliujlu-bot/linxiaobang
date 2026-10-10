'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
const nav=[['home','/','首页','home'],['publish','/publish','发布','plus'],['orders','/orders','订单','list'],['me','/me','我的','user']] as const;
function Icon({kind}:{kind:string}){return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{kind==='home'?<><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>:kind==='plus'?<><rect x="3" y="3" width="18" height="18" rx="6"/><path d="M12 7v10M7 12h10"/></>:kind==='list'?<><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M9 8h6M9 12h6M9 16h4"/></>:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>}</svg>;}
export function BottomNav({active}:{active?:'home'|'publish'|'orders'|'me'}){
 const path=usePathname(),current=active||(path==='/publish'?'publish':path.startsWith('/orders')?'orders':path==='/me'||path==='/admin'?'me':'home');
 return <nav className="bottom-nav" aria-label="主要导航">{nav.map(([id,href,label,icon])=><Link key={id} href={href} aria-current={current===id?'page':undefined}><Icon kind={icon}/><span>{label}</span></Link>)}</nav>;
}
