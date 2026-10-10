import {runMaintenance} from '../src/modules/maintenance/service';
import {pool} from '../src/lib/db';
let stopped=false;
const once=process.argv.includes('--once');
process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
do{
 try{const result=await runMaintenance(new Date());console.log('Maintenance completed',result);}
 catch{console.error('Maintenance failed; check local database availability.'+(once?'':' Will retry.'));if(once)process.exitCode=1;}
 if(once)break;
 for(let i=0;i<60&&!stopped;i++)await new Promise(r=>setTimeout(r,1000));
}while(!stopped);
await pool.end();
