import type {Metadata} from 'next';
import {BottomNav} from '../components/BottomNav';
import './globals.css';
export const metadata:Metadata={title:'邻小帮 · 顺路帮个小忙',description:'邻里小任务，本地虚构数据演示'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body><a href="#main" className="skip-link">跳转到内容</a><div className="app-frame"><header className="brand"><span className="brand-mark" aria-hidden="true">邻</span><strong>邻小帮</strong><span className="local-pill">本地演示</span></header><main id="main">{children}</main><BottomNav/></div></body></html>;}
