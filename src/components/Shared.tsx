'use client';
import Link from 'next/link';
import {useEffect,useRef,type ReactNode} from 'react';
export function DemoNotice(){return <p className="demo-notice"><span aria-hidden="true">◈</span> 演示数据，无实际资金往来</p>;}
export function Loading(){return <div className="loading" role="status"><span className="spinner"/>加载中…</div>;}
export function ErrorNotice({message}:{message:string}){return message?<p className="error" role="alert">{message}</p>:null;}
export function LoginHint(){return <section className="empty"><div className="empty-icon">邻</div><h2>先认识一下吧</h2><p>登录后查看社区任务，<br/>或者发布一件需要帮忙的小事。</p><Link className="primary link-button" href="/me">去登录</Link><p className="small">仅限18岁以上 · 只使用虚构信息</p></section>;}
export function Dialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
 return <dialog ref={ref} onCancel={e=>{e.preventDefault();onClose();}} aria-label={title}><h2>{title}</h2>{children}</dialog>;
}
export function Empty({title,description}:{title:string;description:string}){return <section className="empty"><div className="empty-icon">☷</div><h2>{title}</h2><p>{description}</p><Link href="/publish" className="text-link">发布第一件小事 →</Link></section>;}
