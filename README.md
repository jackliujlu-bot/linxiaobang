# 邻小帮
手机优先的邻里小任务本地演示。仅取餐和袋装普通生活垃圾，2/3 元均为模拟数字，无实际资金往来。

目标源码仓库：jackliujlu-bot/linxiaobang（公开）。公开交付只含源码与运行说明，不包含数据库、凭据或原始会话材料。

## 边界
- 只在 127.0.0.1 使用，虚构数据，18 岁以上测试账户
- 无支付、提现、短信、聊天、地图或第三方登录
- 对外试点前必须补齐 HTTPS、邀请与滥用防护、隐私告知、运维和账号找回评估
- 密码使用 Argon2id，Cookie HttpOnly/SameSite=Strict；所有变更需要相同 Origin 和 X-CSRF 请求头
- 本地 HTTP 演示不能作为公网安全部署模板

## 阶段性发布状态
本检查点为后端阶段：38项真实PostgreSQL测试与类型检查通过。手机页面、生产构建、容器与备份验收仍在继续；独立整体验证和Mac部署尚未完成。此阶段不应当作可直接使用的完整应用。

## 原生本地运行（云端 Linux / Mac）
需要 Node 24。请在目标机器重新安装依赖，不能复制 Linux node_modules 到 Mac。
终端一：
1. npm ci
2. npm run db:local

终端二：
1. set -a; . .local/env; set +a
2. npm run db:migrate
3. npm run dev
4. 浏览器打开 http://127.0.0.1:3000

终端三使用同一环境文件后执行 npm run maintenance。维护进程启动立即清理、之后每 60 秒执行。
生产模式使用 npm run build，然后 npm start，仍然只监听 127.0.0.1。

数据库程序来自 npm 的 embedded-postgres 平台包。它仅在本项目 .local 下写数据，使用随机生成的本地数据库密码，并仅监听 127.0.0.1:55432。停止终端一会干净停止数据库；重新运行保留数据。

## 自动化验证
使用单独 linxiaobang_test 数据库；测试会清空这个库的业务数据。
set -a; . .local/test-env; set +a
npm run db:migrate
npm run typecheck
npm test
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
npm run build

Mac 上可改为安装 Playwright Chromium（需安装授权）：npx playwright install chromium，再省略 CHROMIUM_PATH。已有 Chrome/Chromium 也可指定其可执行文件路径。
切勿将 DATABASE_URL 指向需要保留的数据后运行测试。

## 管理员
加载 .local/env 后运行 npm run admin:create，现场交互输入独立用户名与密码。没有预置管理员、测试管理员或默认密码。

## 交付状态
云端实现、独立审查、远端推送、Mac 实际部署是四个独立验收项。具体已验证记录见 docs/IMPLEMENTATION-NOTES.md；未记录的阶段不得推定完成。
