import {test,expect,type Page} from '@playwright/test';
import {randomBytes} from 'node:crypto';
const password=randomBytes(24).toString('hex');
async function register(page:Page,name:string){
 await page.goto('/me');
 await page.getByRole('button',{name:'注册新账户'}).click();
 await page.getByLabel('用户名').fill(name);
 await page.getByLabel('密码',{exact:true}).fill(password);
 await page.getByLabel('我已满18岁').check();
 await page.getByRole('button',{name:'注册并登录'}).click();
 await expect(page.getByText('已登录', {exact:true})).toBeVisible();
}
test('two accounts complete publication, atomic claim, delivery and confirmation',async({browser},testInfo)=>{
 const owner=await browser.newContext({viewport:{width:360,height:800}});
 const helper=await browser.newContext({viewport:{width:390,height:844}});
 const p=await owner.newPage(),h=await helper.newPage();const n=Date.now().toString().slice(-10);
 await register(p,'owner_'+n);await register(h,'helper_'+n);
 await p.getByRole('link',{name:'发布',exact:true}).click();
 await p.getByLabel('取件区域').fill('示例社区南门公共交接点示例社区南门公共交接点');
 await p.getByLabel('送达区域').fill('示例社区西门');
 await p.getByLabel('私密交接说明').fill('虚构取餐码 TEST123。'.repeat(12));
 const deadline=new Date(Date.now()+3600000);deadline.setMinutes(deadline.getMinutes()-deadline.getTimezoneOffset());
 await p.getByLabel('截止时间').fill(deadline.toISOString().slice(0,16));
 await p.getByRole('button',{name:'检查并发布'}).click();
 await p.getByRole('button',{name:'确认发布'}).click();
 await expect(p.getByRole('heading',{name:'任务详情'})).toBeVisible();
 const path=new URL(p.url()).pathname;
 await h.goto(path);await expect(h.getByText('虚构取餐码 TEST123。',{exact:false})).toHaveCount(0);
 await h.getByRole('button',{name:'领取任务',exact:true}).click();
 await expect(h.getByRole('button',{name:'标记已送达'})).toBeVisible();
 await h.evaluate(()=>window.scrollTo(0,0));
 await h.screenshot({path:testInfo.outputPath('helper-claimed-390.png'),fullPage:false});
 await h.getByRole('button',{name:'标记已送达'}).click();
 await p.reload();await p.getByRole('button',{name:'确认完成',exact:true}).click();
 await p.getByRole('button',{name:'确认，已收到'}).click();
 await expect(p.getByText('已完成',{exact:true}).first()).toBeVisible();
 await expect(p.locator('.skip-link')).not.toBeFocused();
 await expect(p.getByText('演示数据，无实际资金往来').first()).toBeVisible();
 for(const page of[p,h]){await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await p.evaluate(()=>window.scrollTo(0,0));
 await p.screenshot({path:testInfo.outputPath('completed-360.png'),fullPage:false});
 for(const [category,pickupArea,dropoffArea,bountyCents] of [['MEAL','示例社区 · 南门取餐架','示例社区 · 中庭公共点',200],['TRASH','示例社区 · 东侧公共点','示例社区 · 分类收集点',300]]){
  const fixture=await p.request.post('/api/orders',{headers:{origin:'http://127.0.0.1:3000','x-csrf':'1','x-request-id':crypto.randomUUID()},data:{category,pickupArea,dropoffArea,bountyCents,privateDetails:'仅供截图的虚构交接说明',deadlineAt:new Date(Date.now()+3600000).toISOString()}});expect(fixture.ok()).toBeTruthy();
 }
 for(const [name,path,title] of [['首页','/','顺路帮个小忙'],['发布','/publish','发布小任务'],['订单','/orders','我的订单'],['我的','/me','我的']]){await p.getByRole('link',{name,exact:true}).click();await expect(p).toHaveURL('http://127.0.0.1:3000'+path);await expect(p.getByRole('heading',{name:title,exact:true})).toBeVisible();if(name==='首页'){await expect(p.locator('.order-card').first()).toBeVisible();await p.evaluate(()=>window.scrollTo(0,0));await p.screenshot({path:testInfo.outputPath('home-360.png'),fullPage:false});}}

 await owner.close();await helper.close();
});
test('empty, failure and loading states are clear; cancellation needs confirmation',async({page},testInfo)=>{
 await register(page,'empty_'+Date.now().toString().slice(-10));
 await page.goto('/orders');await expect(page.getByText('还没有相关订单')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('orders-empty.png'),fullPage:false});
 await page.route('**/api/orders?*',async route=>{await new Promise(r=>setTimeout(r,700));await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'暂时无法加载，请重试'})});});
 await page.goto('/');await expect(page.getByRole('status').filter({hasText:'加载中'})).toBeVisible();await expect(page.locator('p[role=alert]')).toContainText('暂时无法加载');
});
test('losing a claim race shows useful feedback',async({page,browser})=>{
 await register(page,'race_'+Date.now().toString().slice(-10));
 await page.route('**/api/orders/*/actions',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'任务已被领取或状态已变化，请刷新'})}));
 const other=await browser.newContext();const op=await other.newPage();await register(op,'fixture_'+Date.now().toString().slice(-10));
 const res=await op.request.post('/api/orders',{headers:{origin:'http://127.0.0.1:3000','x-csrf':'1'},data:{category:'MEAL',pickupArea:'虚构南门',dropoffArea:'虚构西门',privateDetails:'测试隐私',bountyCents:200,deadlineAt:new Date(Date.now()+3600000).toISOString()}});
 expect(res.ok()).toBeTruthy();const open=await res.json();await other.close();
 await page.goto('/orders/'+open.id);await page.getByRole('button',{name:'领取任务',exact:true}).click();await expect(page.locator('p[role=alert]')).toContainText('任务已被领取');
});
test('cancel requires explicit confirmation and dismissal preserves order',async({page})=>{
 await register(page,'cancel_'+Date.now().toString().slice(-10));
 const r=await page.request.post('/api/orders',{headers:{origin:'http://127.0.0.1:3000','x-csrf':'1'},data:{category:'TRASH',pickupArea:'虚构公共点',dropoffArea:'虚构垃圾收集点',privateDetails:'测试普通袋装生活垃圾',bountyCents:300,deadlineAt:new Date(Date.now()+3600000).toISOString()}});
 const order=await r.json();await page.goto('/orders/'+order.id);
 await page.getByRole('button',{name:'取消任务',exact:true}).click();
 await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'暂不取消'}).click();
 await expect(page.getByText('待接单',{exact:true}).first()).toBeVisible();
 await page.getByRole('button',{name:'取消任务',exact:true}).click();await page.getByRole('button',{name:'确认取消'}).click();
 await expect(page.getByText('已取消',{exact:true}).first()).toBeVisible();
});
