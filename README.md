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
本检查点已包含可运行的手机优先完整流程。真实PostgreSQL测试、浏览器/HTTP端到端测试、类型检查、干净安装、生产构建、重启持久化与隔离备份恢复均已通过（详细记录见 docs/IMPLEMENTATION-NOTES.md）。独立全量代码审查已完成，所发现的4项重要问题已修复并补充回归。Mac部署仍待验收，Docker尚未实际运行验证。仅按下述原生本地流程运行虚构数据演示。

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

## 备份与隔离恢复
在项目根目录加载数据库环境后：
- sh scripts/backup.sh .local/demo.backup.json
- sh scripts/restore-test.sh .local/demo.backup.json

备份以 repeatable-read 一致快照写入所有应用表，文件权限为0600，若路径已存在则拒绝覆盖。备份包含账号哈希、会话摘要及私密说明，必须保密，不能上传到公开仓库。
恢复验证只接受当前迁移版本的备份，自动创建随机 linxiaobang_restore_ 临时数据库，插入所有记录、逐表比较完整行摘要，再删除该临时库；没有覆盖现有数据库的选项。
这是本应用的逻辑备份验证，不是通用 PostgreSQL 物理备份工具。数据库账号须拥有创建临时数据库权限。

## Docker Compose（需目标电脑已有 Docker）
镜像基于 Node 24.19.0 bookworm-slim 和 PostgreSQL 18.4 bookworm，compose.yaml 锁定标签。
在本地 .env 文件设置 POSTGRES_PASSWORD 为新生成的十六进制密码，不用示例占位符。
- docker compose up --build -d
- docker compose logs -f app maintenance
- docker compose exec app npm run admin:create
- docker compose stop
- docker compose start

只发布 127.0.0.1:3000；数据库和维护进程没有主机端口。容器内部的0.0.0.0是Docker私有网络监听，主机仍只暴露回环地址。
不要运行 docker compose down -v，除非明确打算删除数据库卷。Mac 首次安装 Docker 或其他系统依赖，需要在目标电脑另行确认。
本云端环境没有 Docker，容器配置通过静态约束测试，容器实际构建与启动必须在有 Docker 的目标机验证。

## 云端受限浏览器测试
如果现有 Chromium 因受限Unix套接字无法启动，Linux 云端可使用项目内 headless shell：
export CHROMIUM_PATH=$(node --input-type=module -e "import c from '@sparticuz/chromium'; console.log(await c.executablePath())")
npm run test:e2e
这不会安装系统浏览器或修改网络安全设置。Mac 请使用本机 Chromium 或 Playwright 的对应平台浏览器，不能使用 Linux headless shell。

## 版本与结构
依赖精确版本在 package.json / package-lock.json；Node运行范围固定为24.x。
src/modules 分为 auth、orders、moderation、maintenance；参数化SQL和事务在 src/lib；迁移按编号追加，不修改已应用的迁移。
所有本地环境文件、数据库、备份、浏览器记录和原始审阅文档都不进入Git或Docker构建上下文。
