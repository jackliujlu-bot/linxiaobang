'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {useSession,api} from '../lib/client';
import type {OrderView} from '../lib/contracts';
import {DemoNotice,Loading,ErrorNotice,LoginHint,Empty} from '../components/Shared';
import {OrderCard} from '../components/OrderCard';
export default function Home(){
 const{user,loading}=useSession();const[category,setCategory]=useState(''),[orders,setOrders]=useState<OrderView[]>([]),[busy,setBusy]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>{if(!user)return;let active=true;setBusy(true);setError('');api<OrderView[]>('/api/orders?category='+category).then(v=>{if(active)setOrders(v);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[user,category,revision]);
 return <><p className="eyebrow">顺路的善意，刚好在身边</p><h1>顺路帮个小忙</h1><p className="subtitle">取餐、倒垃圾，让日常轻松一点。</p><section className="hero"><h2>小事有人帮，邻里更轻松</h2><p>只做简单小事，在公共交接点碰面。</p><Link href="/publish">我需要帮忙 <span>＋</span></Link></section><DemoNotice/>{loading?<Loading/>:!user?<LoginHint/>:<><div className="section-heading"><h2>附近的小任务</h2><span>虚构社区 · 本机体验</span></div><div className="chips">{[['','全部'],['MEAL','取餐'],['TRASH','倒垃圾']].map(([v,l])=><button key={v} aria-pressed={category===v} onClick={()=>setCategory(v)}>{l}</button>)}</div><ErrorNotice message={error}/>{error&&<button className="secondary" onClick={()=>setRevision(n=>n+1)}>重新加载</button>}{busy?<Loading/>:!error&&(orders.length?orders.map(o=><OrderCard key={o.id} order={o}/>):<Empty title="暂时没有待接的小任务" description="有需要时发一单，顺路的人也许能帮上忙。"/>)}</>}</>;
}
