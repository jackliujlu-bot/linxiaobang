import pg from 'pg';
const globalDb=globalThis as unknown as {linxiaobangPool?:pg.Pool};
export const pool=globalDb.linxiaobangPool ?? new pg.Pool({connectionString:process.env.DATABASE_URL,max:60});
if(process.env.NODE_ENV!=='production')globalDb.linxiaobangPool=pool;
export type Client=pg.PoolClient;
export async function transaction<T>(fn:(client:Client)=>Promise<T>):Promise<T>{
 const c=await pool.connect();
 try{await c.query('BEGIN');const result=await fn(c);await c.query('COMMIT');return result;}
 catch(error){await c.query('ROLLBACK');throw error;}finally{c.release();}
}
