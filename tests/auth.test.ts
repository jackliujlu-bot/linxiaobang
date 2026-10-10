import {describe,it,expect} from 'vitest';
import {randomBytes} from 'node:crypto';
import {registerUser,login,logout,requireActor} from '../src/modules/auth/service';
import {pool} from '../src/lib/db';
import {assertMutation} from '../src/lib/http';
const input={username:'neighbor_one',password:randomBytes(24).toString('hex'),adultConfirmed:true};
describe('authentication',()=>{
 it('rejects non-adults',async()=>expect(registerUser({...input,adultConfirmed:false},new Date())).rejects.toMatchObject({status:400}));
 it('rejects duplicate accounts',async()=>{await registerUser(input,new Date());await expect(registerUser(input,new Date())).rejects.toMatchObject({status:409});});
 it('rejects wrong password without leaking account existence',async()=>{await registerUser(input,new Date());await expect(login({...input,password:'incorrect long password'},new Date())).rejects.toMatchObject({status:401});await expect(login({...input,username:'missing_user'},new Date())).rejects.toMatchObject({status:401});});
 it('limits five failures per 15 minutes',async()=>{for(let i=0;i<5;i++)await expect(login(input,new Date())).rejects.toMatchObject({status:401});await expect(login(input,new Date())).rejects.toMatchObject({status:429});});
 it('logs out and invalidates old session',async()=>{const actor=await registerUser(input,new Date());const result=await login(input,new Date());expect(await requireActor(result.sessionToken)).toEqual(actor);await logout(result.sessionToken);await expect(requireActor(result.sessionToken)).rejects.toMatchObject({status:401});});
 it('rejects cross origin and missing CSRF header',()=>{expect(()=>assertMutation(new Request('http://127.0.0.1:3000/api/orders',{method:'POST',headers:{origin:'https://evil.example','x-csrf':'1','content-type':'application/json'}}))).toThrowError(expect.objectContaining({status:403}));expect(()=>assertMutation(new Request('http://127.0.0.1:3000/api/orders',{method:'POST',headers:{origin:'http://127.0.0.1:3000','content-type':'application/json'}}))).toThrowError(expect.objectContaining({status:403}));});
 it('has no default admin',async()=>{expect((await pool.query("SELECT count(*) FROM users WHERE role='ADMIN'")).rows[0].count).toBe('0');});
});
it('rejects expired sessions and stores only token hashes',async()=>{await registerUser(input,new Date());const result=await login(input,new Date(Date.now()-8*86400000));await expect(requireActor(result.sessionToken)).rejects.toMatchObject({status:401});const sessions=await pool.query('SELECT token_hash FROM sessions');expect(sessions.rows[0].token_hash).not.toBe(result.sessionToken);expect(sessions.rows[0].token_hash).toHaveLength(64);});
it('does not allow role injection at registration',async()=>{const a=await registerUser({...input,role:'ADMIN'} as any,new Date());expect(a.role).toBe('USER');});
