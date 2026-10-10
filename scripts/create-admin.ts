import readline from 'node:readline/promises';
import {registerUser} from '../src/modules/auth/service';
import {pool} from '../src/lib/db';
if(!process.stdin.isTTY)throw new Error('管理员初始化必须在交互终端运行');
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const username=await rl.question('管理员用户名：');rl.close();
function hidden(prompt:string):Promise<string>{
 process.stdout.write(prompt);process.stdin.setRawMode(true);process.stdin.resume();
 return new Promise((resolve,reject)=>{let value='';const listener=(chunk:Buffer)=>{
 for(const char of chunk.toString()){
 if(char==='\u0003'){finish();reject(new Error('已取消'));return;}
 if(char==='\r'||char==='\n'){finish();resolve(value);return;}
 if(char==='\u007f'){value=value.slice(0,-1);}else if(char>=' ')value+=char;
 }
 };function finish(){process.stdin.off('data',listener);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');}process.stdin.on('data',listener);});
}
try{const password=await hidden('密码（至少12位，不回显）：');const confirm=await hidden('再次输入密码：');if(password!==confirm)throw new Error('两次密码不一致');const a=await registerUser({username,password,adultConfirmed:true},new Date());await pool.query("UPDATE users SET role='ADMIN' WHERE id=$1",[a.id]);console.log('管理员已创建。请通过本机页面登录。');}
finally{await pool.end();}
