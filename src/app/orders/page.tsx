'use client';
import {useEffect,useState} from 'react';
import {api,useSession} from '../../lib/client';
import type {OrderView} from '../../lib/contracts';
import {DemoNotice,Loading,LoginHint,Empty,ErrorNotice} from '../../components/Shared';
import {OrderCard} from '../../components/OrderCard';
export default function Orders(){
 const{user,loading}=useSession(),[orders,setOrders]=useState<OrderView[]>([]),[filter,setFilter]=useState('ALL'),[busy,setBusy]=useState(true),[error,setError]=useState('');
 useEffect(()=>{let active=true;if(user)api<OrderView[]>('/api/orders?scope=mine').then(v=>{if(active)setOrders(v);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setBusy(false);});return()=>{active=false;};},[user]);
 const shown=orders.filter(o=>filter==='ALL'||(filter==='POSTED'?o.requesterId===user?.id:o.assigneeId===user?.id));
 return <><p className="eyebrow">每一件小事，都有下文</p><h1>我的订单</h1><DemoNotice/>{loading?<Loading/>:!user?<LoginHint/>:<><div className="chips">{[['ALL','全部'],['POSTED','我发布的'],['CLAIMED','我接的']].map(([v,l])=><button key={v} aria-pressed={filter===v} onClick={()=>setFilter(v)}>{l}</button>)}</div><ErrorNotice message={error}/>{busy?<Loading/>:!error&&(shown.length?shown.map(o=><OrderCard key={o.id} order={o}/>):<Empty title="还没有相关订单" description="发布或领取任务后，可以在这里查看进展。"/>)}</>}</>;
}
