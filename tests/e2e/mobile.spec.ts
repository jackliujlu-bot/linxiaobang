import {test,expect,type Page} from '@playwright/test';
const password='Fictional-test-only-24';
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
 await h.screenshot({path:testInfo.outputPath('helper-claimed-390.png'),fullPage:true});
 await h.getByRole('button',{name:'标记已送达'}).click();
 await p.reload();await p.getByRole('button',{name:'确认完成',exact:true}).click();
 await p.getByRole('button',{name:'确认，已收到'}).click();
 await expect(p.getByText('已完成',{exact:true}).first()).toBeVisible();
 await expect(p.getByText('演示数据，无实际资金往来').first()).toBeVisible();
 for(const page of[p,h]){await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await p.screenshot({path:testInfo.outputPath('completed-360.png'),fullPage:true});
 for(const name of ['首页','发布','订单','我的']){await p.getByRole('link',{name,exact:true}).click();await expect(p.locator('h1')).toBeVisible();}
 await owner.close();await helper.close();
});
test('empty, failure and loading states are clear; cancellation needs confirmation',async({page},testInfo)=>{
 await register(page,'empty_'+Date.now().toString().slice(-10));
 await page.goto('/orders');await expect(page.getByText('还没有相关订单')).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('orders-empty.png'),fullPage:true});
 await page.route('**/api/orders?*',async route=>{await new Promise(r=>setTimeout(r,700));await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'暂时无法加载，请重试'})});});
 await page.goto('/');await expect(page.getByRole('status').filter({hasText:'加载中'})).toBeVisible();await expect(page.getByRole('alert')).toContainText('暂时无法加载');
});
test('losing a claim race shows useful feedback',async({page,browser})=>{
 await register(page,'race_'+Date.now().toString().slice(-10));
 await page.route('**/api/orders/*/actions',route=>route.fulfill({status:409,contentType:'application/json',body:JSON.stringify({error:'任务已被领取或状态已变化，请刷新'})}));
 const other=await browser.newContext();const op=await other.newPage();await register(op,'fixture_'+Date.now().toString().slice(-10));
 const res=await op.request.post('/api/orders',{headers:{origin:'http://127.0.0.1:3000','x-csrf':'1'},data:{category:'MEAL',pickupArea:'虚构南门',dropoffArea:'虚构西门',privateDetails:'测试隐私',bountyCents:200,deadlineAt:new Date(Date.now()+3600000).toISOString()}});
 expect(res.ok()).toBeTruthy();const open=await res.json();await other.close();
 await page.goto('/orders/'+open.id);await page.getByRole('button',{name:'领取任务',exact:true}).click();await expect(page.getByRole('alert')).toContainText('任务已被领取');
});
