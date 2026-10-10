import {pool} from '../../../lib/db';
export const dynamic='force-dynamic';
export async function GET(){try{await pool.query('SELECT 1 FROM schema_migrations LIMIT 1');return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({ok:false},{status:503});}}
