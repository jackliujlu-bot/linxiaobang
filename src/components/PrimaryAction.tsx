'use client';
export function PrimaryAction({label,busy,onClick}:{label:string;busy:boolean;onClick:()=>void}){return <button className="primary" disabled={busy} onClick={onClick}>{busy?'处理中…':label}</button>;}
