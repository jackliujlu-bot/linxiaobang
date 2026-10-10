import {pool} from '../src/lib/db';
import {randomUUID} from 'node:crypto';
import type {Actor,CreateOrderInput} from '../src/lib/contracts';
export async function actor(role:'USER'|'ADMIN'='USER'):Promise<Actor>{
 const id=randomUUID();await pool.query("INSERT INTO users(id,username,password_hash,role) VALUES($1,$2,'fixture-never-login',$3)",[id,'fixture_'+id.slice(0,12),role]);return{id,role};
}
export const future=()=>new Date(Date.now()+3600000).toISOString();
export const orderInput=():CreateOrderInput=>({category:'MEAL',pickupArea:'示例社区南门',dropoffArea:'示例社区公共交接点',deadlineAt:future(),bountyCents:200,privateDetails:'虚构取餐码 A123；请在公共点交接。'});
