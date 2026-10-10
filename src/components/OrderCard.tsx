'use client';
import Link from 'next/link';
import type {OrderView} from '../lib/contracts';
import {categoryLabel,statusLabel,dateText} from '../lib/client';
export function OrderCard({order:o}:{order:OrderView}){return <Link className="order-card" href={'/orders/'+o.id}><div className="card-top"><span className={'category-icon '+o.category.toLowerCase()} aria-hidden="true">{o.category==='MEAL'?'♨':'♧'}</span><div className="card-heading"><strong>{categoryLabel[o.category]}</strong><span className="small">{statusLabel[o.status]}</span></div><div className="bounty"><b>¥{o.bountyCents/100}</b><span>模拟悬赏</span></div></div><div className="route-line"><i>取</i><span>{o.pickupArea}</span></div><div className="route-line"><i>送</i><span>{o.dropoffArea}</span></div><div className="card-foot"><span>{dateText(o.deadlineAt)} 前</span><span>查看详情 <b>›</b></span></div></Link>;}
