import {it,expect} from 'vitest';
import {assertMutation,errorResponse} from '../src/lib/http';
it('rejects absent origin and rejects non-json mutations',()=>{
 for(const headers of[{'x-csrf':'1','content-type':'application/json'},{origin:'http://127.0.0.1:3000','x-csrf':'1','content-type':'text/plain'}]){
 expect(()=>assertMutation(new Request('http://127.0.0.1:3000/api/orders',{method:'POST',headers:headers as Record<string,string>}))).toThrowError(expect.objectContaining({status:403}));}
});
it('does not leak errors or SQL details',async()=>{const res=errorResponse(new Error('postgres password=secret detail'));expect(res.status).toBe(500);expect(await res.text()).not.toContain('secret');});
