# 邻小帮第一版实施计划

已批准，实施中。2026年10月10日。源码按经验证的里程碑持续发布；完整验收仍需逐项完成。

目标：在 dot 的云端电脑开发、测试和打包，推送到公开仓库 jackliujlu-bot/linxiaobang，再部署到你的 Mac 本地。依据：已确认的《邻小帮第一版产品设计》及最新的执行环境要求。只有实际确认 Mac 无法部署时才改用联想。

执行建议：同一个执行者在云端按顺序开发，每步先写测试、观察失败、实现最小功能、验证通过并提交，最后做一次完整代码审查，再移交 Mac 部署验收，减少重复上下文开销。本计划和执行方式确认后可开始云端开发；Mac 连接授权在部署阶段检查。

## 架构与固定边界

技术方案：TypeScript、Next.js、PostgreSQL；pg 访问数据库，Zod 校验输入，Argon2id 哈希密码，Vitest 与 Playwright 测试。云端已有 Node 24、Python 3.12 和 Git。采用模块化单体；第1步核验兼容版本并锁入 lockfile、容器标签及 README，交付前核验 Mac 架构兼容。

只监听 127.0.0.1；不开放公网或局域网，不改网络安全设置。只用虚构数据和本地用户名密码，无短信、邮件、第三方登录依赖。密码、密钥、数据库和真实资料不得入库。新增软件安装须另行确认。

只支持取餐、普通袋装生活垃圾；悬赏金额为200或300分。全部金额页面显示“演示数据，无实际资金往来”。无真实支付、提现、聊天或地图。仅成年用户试点，首测不对外开放。

## 文件边界与统一接口

src/lib/contracts.ts 定义共享类型；src/lib/db.ts 管理参数化 SQL 与事务；db/migrations 下逐步增加迁移，不改已执行迁移。业务分别放在 src/modules/auth/service.ts、orders/service.ts、orders/actions.ts、moderation/service.ts、maintenance/service.ts。

页面放在 src/app 下：首页 page.tsx，publish、orders、orders/[id]、me、admin 各自的 page.tsx；API 放在 src/app/api 对应路径。tests 下与业务同名，tests/e2e/mobile.spec.ts 负责完整流程。

共享类型：Id=string；Actor={id: Id, role: "USER"|"ADMIN"}；OrderStatus="OPEN"|"CLAIMED"|"DELIVERED"|"COMPLETED"|"CANCELLED"|"EXPIRED"；SimStatus="HELD"|"SETTLED"|"REFUNDED"。数据库存 UTC，界面显示本地时间。

OrderView 含 id、category、pickupArea、dropoffArea、deadlineAt、bountyCents、status、simStatus、requesterId: Id、assigneeId: Id|null、disputeOpen: boolean；privateDetails?: string 仅有权限时返回。deadlineAt为UTC时间字符串，列表不含privateDetails。

## 重点检查

以下五类输入必须有测试：同秒抢单及取消竞争；网络重试重复提交；普通用户猜测他人订单ID；截止时间恰好到达及重启补清理；360px窄屏、长地址和空列表。分别由第2至第5步覆盖。



## 1  可登录的本地基础

文件：package.json、package-lock.json、compose.yaml、Dockerfile、.env.example、.gitignore、README.md；db/migrations/001_auth.sql；src/lib/{contracts, db}.ts；src/modules/auth/service.ts；src/app/api/auth/[action]/route.ts；tests/auth.test.ts；scripts/create-admin.ts。迁移创建users、sessions、communities。

接口：registerUser(input: {username: string, password: string, adultConfirmed: boolean}, now: Date): Promise<Actor>；login(input: {username: string, password: string}, now: Date): Promise<{actor: Actor, sessionToken: string}>；requireActor(sessionToken: string): Promise<Actor>；logout(sessionToken: string): Promise<void>。会话令牌只进入HttpOnly、SameSite Cookie，绝不返回页面数据。

- [ ] 先检查 dot 云端工作目录、Git 状态、Node 24 和现有依赖；保留未提交修改，仓库存在则复用。将设计和计划放入项目文档。此步不依赖 Mac 连接，也不在 Mac 开发；若需新增软件安装，先确认必要安装。

- [ ] 先写 auth.test.ts：成年声明为false拒绝；同名账户409；错误密码401；重复失败触发429；退出后旧会话401；跨来源状态修改403；无默认管理员账户。执行 npm test -- auth.test.ts，确认测试因目标行为缺失失败。

关键断言 auth_rejects_cross_origin：expect(response.status).toBe(403)。

- [ ] 实现最小认证、会话失效和限流：用户名3–32字符，密码12–128字符；连续失败限5次/15分钟。管理员仅本机交互初始化，用户现场输入密码。加入来源校验与CSRF保护，不将账号是否存在暴露在登录错误里。

- [ ] 执行 npm test -- auth.test.ts && npm run typecheck；全部通过后提交 feat: add local authentication。

## 2  发布任务与隐私展示

文件：src/modules/orders/service.ts；src/app/api/orders/route.ts、src/app/api/orders/[id]/route.ts；src/app/publish/page.tsx；tests/orders.test.ts；db/migrations/002_orders.sql 创建orders与order_private。

接口：CreateOrderInput={category: "MEAL"|"TRASH", pickupArea: string, dropoffArea: string, deadlineAt: string, bountyCents: 200|300, privateDetails: string}；createOrder(actor: Actor, input: CreateOrderInput, now: Date): Promise<OrderView>；listOrders(actor: Actor, filter: {category?: "MEAL"|"TRASH"}, now: Date): Promise<OrderView[]>；getOrder(actor: Actor, id: Id, now: Date): Promise<OrderView>。

- [ ] 先写 orders.test.ts：199/301分、未知分类、过去或恰好当前截止时间均400；发单人可见私密详情；第三人及列表看不到 privateDetails；GET必须登录；创建成功为OPEN+HELD。运行 npm test -- orders.test.ts，确认失败。

关键断言 list_hides_private_details：expect(list[0]).not.toHaveProperty("privateDetails")。

- [ ] 实现参数化查询、数据校验和一页发布表单；公开区域每项1–50字符，私密说明1–300字符。提供2元/3元按钮、提交摘要与内容安全提示；只能使用虚构样例。

- [ ] 执行 npm test -- orders.test.ts && npm run typecheck；全部通过后提交 feat: add task publishing and privacy。



## 3  抢单与履约状态

文件：src/modules/orders/actions.ts；src/app/api/orders/[id]/actions/route.ts；tests/actions.test.ts；db/migrations/003_actions.sql 创建order_events与idempotency_requests。依赖第1步身份和第2步订单读取。

接口：actOnOrder(actor: Actor, id: Id, action: "CLAIM"|"DELIVER"|"CONFIRM"|"CANCEL", requestId: string, now: Date): Promise<OrderView>。POST携带唯一requestId；同请求同内容复用结果，同键不同内容409。

- [ ] 先写 actions.test.ts：50人同时领取，成功数为1；自己接单403；非接单人送达403；非发布者确认403；重复确认只产生一次结算记录；截止时刻不可抢单；取消与抢单竞争后状态一致。运行 npm test -- actions.test.ts，确认失败。

关键断言 claim_is_atomic：expect(results.filter(r=>r.ok)).toHaveLength(1)。

- [ ] 实现带状态条件的原子更新、行锁及幂等记录。只有当前接单者可送达，只有发布者可确认；待接单可直接取消。完成同时SETTLED，取消/过期同时REFUNDED，不能产生真实资金动作。

- [ ] 执行 npm test -- actions.test.ts && npm run typecheck；全部通过后提交 feat: add atomic order lifecycle。

## 4  取消协商 纠纷与清理

文件：src/modules/{moderation, maintenance}/service.ts；src/app/api/orders/[id]/moderation/route.ts、src/app/api/admin/reports/[id]/route.ts；src/app/admin/page.tsx；tests/{moderation, maintenance}.test.ts；scripts/maintenance.ts；db/migrations/004_moderation.sql 创建cancel_requests、reports、audit_events。

接口：requestCancellation(actor: Actor, id: Id, reason: string): Promise<Id>；respondCancellation(actor: Actor, requestId: Id, accept: boolean): Promise<OrderView>；reportOrder(actor: Actor, id: Id, reason: string): Promise<Id>；viewReportDetails(admin: Actor, reportId: Id): Promise<OrderView>；resolveReport(admin: Actor, reportId: Id, result: "DISMISS"|"CANCEL"|"COMPLETE", reason: string): Promise<void>；runMaintenance(now: Date): Promise<{expired: number, purged: number}>。

- [ ] 先写测试：已接单取消需对方同意；第三方不能回应；双方纠纷阻止确认；旁观者举报不冻结；非管理员403；取消立刻撤销接单者私密访问；管理员查看和处理均留审计。运行 npm test -- moderation.test.ts，确认失败。

- [ ] 实现请求与处理界面；拒绝重复开放取消申请，取消、确认和裁定共享订单锁。管理员通过案件入口读取私密详情；COMPLETE仅适用于已送达且纠纷已解决的订单，完成后的举报不自动改写结算。

- [ ] 再写 maintenance.test.ts：普通结束订单第7天清理、未决纠纷保留、已接订单超时不自动完成、重启立即补跑且再次运行不重复处理。确认失败后实现单独维护进程，每60秒运行；共享应用镜像，无对外端口。

关键断言 purge_after_7_days：expect(privateRowAfterCleanup).toBeNull()；有未决纠纷则not.toBeNull()。

- [ ] 执行 npm test -- moderation.test.ts maintenance.test.ts && npm run typecheck；全部通过后提交 feat: add moderation and retention。



## 5  完成手机优先界面

文件：src/app/page.tsx、src/app/layout.tsx、src/app/globals.css；src/app/orders/page.tsx、src/app/orders/[id]/page.tsx、src/app/me/page.tsx；src/components/{BottomNav, OrderCard, PrimaryAction}.tsx；tests/e2e/mobile.spec.ts。

接口：OrderCard({order: OrderView})；BottomNav({active: "home"|"publish"|"orders"|"me"})；PrimaryAction({label: string, busy: boolean, onClick: ()=>void})。页面调用前述API，不在浏览器决定权限或修改结算状态。

- [ ] 先写 mobile.spec.ts：两账户完整流程；360px和390px无横向滚动；长说明换行；空列表、加载、失败、被抢先领取均有反馈；四入口可达；金额处有模拟提示；取消敏感动作有确认。运行 npm run test:e2e -- mobile.spec.ts，确认失败。

关键断言 mobile_has_no_overflow：expect(scrollWidth).toBeLessThanOrEqual(viewportWidth)。

- [ ] 实现首页、订单、我的和详情页，统一大按钮与状态文案；公开页不显示私密内容，后台入口只给管理员。完成四入口、2元/3元选择、键盘焦点及至少44px点击区域。

- [ ] 执行 npm run test:e2e -- mobile.spec.ts；检查关键页面截图并修复，再提交 feat: finish mobile-first workflow。

## 6  云端交付与 Mac 本地验收

文件：scripts/backup.sh、scripts/restore-test.sh、tests/deployment.test.ts、README.md；更新 compose.yaml 和 .gitignore。

- [ ] 先写部署断言：HTTP端口仅127.0.0.1，数据库无主机公开端口，无默认密码。备份恢复脚本只操作隔离测试数据库，不覆盖现有数据。先运行 npm test -- deployment.test.ts，确认失败。

关键断言 host_is_loopback：expect(binding.host).toBe("127.0.0.1")。

- [ ] 在云端实现部署说明；backup.sh接收输出路径，restore-test.sh接收备份路径并创建隔离测试库。验证重启、恢复与干净重建。启动测试数据库后执行 npm ci && npm run typecheck && npm test && npm run test:e2e && npm run build，要求全通过。

- [ ] 完成独立全量审查并修复、重测。核验仓库归属与public状态，扫描无秘密或数据后推送，不强推覆盖历史；核对远端提交。打包源码和运行说明、记录校验和，不带测试密码或云端数据库。

- [ ] 连接获授权的 Mac，核验传输包或仓库提交，检查运行依赖与芯片架构。不得直接搬用 Linux 的 node_modules；按目标架构构建依赖或容器。确认需要的安装后，仅在本机地址启动，再走通完整流程及重启、恢复测试。

- [ ] 若 Mac 出现实际无法部署且可复现的阻塞，记录证据后启用联想备用部署；暂未连接、未获授权或缺少依赖均先处理，不能直接当作 Mac 失败。交付实际地址、启动/停止命令、测试记录和已知限制。

完成标准：云端开发、测试、打包及审查通过；公开仓库内容一致；Mac 本地部署验收成功，或满足上述条件后在联想验收成功。需要用户授权或信息时只暂停受阻步骤；不把云端开发完成当作本地部署完成。
