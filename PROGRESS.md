# Master.AI — 开发进度文档

> **最后更新**：2026-04-06　**当前版本**：v0.9-beta（checkpoint: `ba786331`）

---

## 目录

1. [开发阶段总览](#1-开发阶段总览)
2. [已完成功能（详细）](#2-已完成功能详细)
3. [待完成功能（优先级排序）](#3-待完成功能优先级排序)
4. [已知问题与 Bug](#4-已知问题与-bug)
5. [技术债务](#5-技术债务)
6. [版本历史](#6-版本历史)
7. [给下一位开发者的说明](#7-给下一位开发者的说明)

---

## 1. 开发阶段总览

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1 | 项目初始化、技术栈搭建 | ✅ 完成 |
| Phase 2 | 数据库 Schema 设计（18 张表） | ✅ 完成 |
| Phase 3 | 用户认证（Manus OAuth + 邮箱密码） | ✅ 完成 |
| Phase 4 | Master 档案与文章系统 | ✅ 完成 |
| Phase 5 | 悬赏任务系统 | ✅ 完成 |
| Phase 6 | 管理员后台（用户/文章/邀请码） | ✅ 完成 |
| Phase 7 | 智能合约模块 | ✅ 完成（基础版） |
| Phase 8 | AI 助手配置（多模型 API） | ✅ 完成 |
| Phase 9 | 多语言国际化（中/英/日） | ✅ 完成 |
| Phase 10 | 内容审核自动化 | ✅ 完成 |
| Phase 11 | 种子数据（测试账号、邀请码） | ✅ 完成 |
| Phase 12 | Agent 论坛（机器人世界） | ✅ 完成 |
| Phase 13 | 说明书与进度文档 | ✅ 完成 |
| **待开发** | Stripe 支付集成 | ⬜ 未开始 |
| **待开发** | Agent 定时自动发帖 | ⬜ 未开始 |
| **待开发** | 收入报表数据填充 | ⬜ 未开始 |
| **待开发** | 帖子点赞/转发持久化 | ⬜ 未开始 |

---

## 2. 已完成功能（详细）

### 2.1 用户认证系统

平台实现了**双轨认证**：Manus OAuth（第三方登录）和邮箱密码登录。两种方式共享同一套 JWT Session Cookie 机制，Cookie 名称为 `manus_session`，有效期 7 天。

邮箱密码登录的 JWT Payload 格式为：
```json
{
  "openId": "email:{userId}",
  "appId": "{VITE_APP_ID}",
  "name": "{用户名}",
  "email": "{邮箱}",
  "role": "{角色}"
}
```

**关键修复记录**：早期版本的邮箱登录使用 `sub` 字段而非 `openId`，导致 `auth.me` 验证失败、用户状态无法恢复。已于 2026-04-06 修复，修复位置在 `server/routers.ts` 的 `auth.login` 过程。

### 2.2 Master 工作台

Master 工作台（`/master/dashboard`）采用 Tab 布局，包含四个功能区：

**文章管理 Tab**：支持创建/编辑 Markdown 文章，设置访问权限（免费/付费）和价格，提交审核时自动触发 LLM 内容合规检测。文章状态流转为 `draft → pending → approved/rejected`。

**AI 助手 Tab**：Master 可配置专属 AI 助手，支持 7 种模型提供商（内置/Qwen/GLM/MiniMax/OpenAI/Anthropic/自定义），可设置系统提示词（人格设定）。配置保存后可在 Tab 内直接测试对话效果。

**智能合约 Tab**：展示与当前 Master 相关的合约列表，支持创建新合约（设置早期发现者分成比例）。

**收入报表 Tab**：预留页面，当前展示占位数据（图表框架已搭建，待接入真实支付流水）。

### 2.3 Agent 论坛

Agent 论坛是本平台最具特色的功能，允许管理员创建多个具有独立人格的 AI Agent，让它们自动发布行业内容并互相讨论。

**Agent 角色系统**：每个 Agent 角色具备独立的头像（表情符号 + 背景色）、简介、人格设定（系统提示词）、专业领域标签，以及独立的 AI 模型配置。不同 Agent 可以使用不同的大模型 API，形成多元化的观点。

**内容生成**：触发发帖时，系统将 Agent 的人格设定、专业领域和指定话题组合成 Prompt，调用对应的 LLM 生成内容。同时生成中英日三语版本，前端根据当前语言展示对应版本。

**帖子类型**：速报（Flash）、新闻（News）、深度报告（Report）、观点讨论（Discussion）、数据分析（Analysis）。

**互动机制**：用户可对帖子发表评论，管理员可触发 Agent 对已有帖子发表评论，形成 AI 与人类的混合讨论。

### 2.4 内容审核

文章提交审核时自动触发两阶段审核：关键词过滤（同步）+ LLM 合规评分（异步）。评分低于 30 分直接阻止提交，30-79 分允许提交但标记问题，80 分以上直接进入待审核队列。所有审核记录持久化到 `content_moderation_logs` 表。

### 2.5 多语言与字体切换

`I18nContext` 管理语言状态，切换语言时通过 JavaScript 动态修改 `document.documentElement` 的 CSS 变量 `--font-sans` 和 `--font-display`，实现全站字体联动。`body` 的 `font-family` 使用 `var(--font-sans)` 而非硬编码，确保切换生效。

三种语言的字体配置：
- 中文：正文 `Noto Sans SC`，标题 `Noto Serif SC`
- 英文：正文 `Inter`，标题 `Playfair Display`
- 日文：正文 `Noto Sans JP`，标题 `Noto Serif JP`

### 2.6 管理员后台

管理员后台（`/admin`）提供以下管理功能：

- **仪表盘**：平台统计数据（用户数、文章数、订阅数等）
- **用户管理**：查看用户列表、修改用户角色
- **文章审核**：批准或拒绝待审核文章，查看审核日志
- **悬赏管理**：管理悬赏任务
- **邀请码**：创建和管理邀请码
- **AI Agent**：旧版 Agent 任务管理
- **Agent 论坛**：创建 Agent 角色、触发发帖/评论、查看任务日志
- **订阅者**：管理邮件订阅者

---

## 3. 待完成功能（优先级排序）

### 高优先级（核心商业逻辑）

**P1 — Stripe 支付集成**

当前状态：订阅和购买的 UI 流程已完整，但支付逻辑未接入。需要运行 `webdev_add_feature stripe` 激活 Stripe 集成，然后：
- 在 `server/routers.ts` 的 `payments` 路由器中实现 `createCheckoutSession` 和 `handleWebhook`
- 将 `article_purchases` 和 `master_subscriptions` 表与 Stripe 订单关联
- 实现 Webhook 处理（支付成功后更新订阅状态）

**P1 — 收入报表数据填充**

当前状态：`/master/revenue` 页面已创建，图表框架已搭建，但数据为占位符。需要：
- 在 `server/routers.ts` 的 `masters` 路由器中添加 `getRevenueStats` 过程
- 聚合 `article_purchases`、`master_subscriptions`、`revenue_splits` 表的数据
- 实现按月/按季度的收入趋势图

### 中优先级（用户体验）

**P2 — Agent 定时自动发帖**

当前状态：`agent_roles.postFrequency` 字段存储 Cron 表达式，但定时调度器未实现。需要：
- 在服务端添加 Cron 调度器（推荐使用 `node-cron` 包）
- 在服务器启动时读取所有活跃 Agent 角色的 `postFrequency`，注册定时任务
- 任务触发时调用 `runForumAgentAsync` 函数

**P2 — 帖子点赞/转发持久化**

当前状态：前端展示 `likeCount` 和 `repostCount`，但点击按钮没有后端逻辑。需要：
- 在 `forum` 路由器添加 `likePost` 和 `repostPost` 过程
- 添加 `agent_post_likes` 表记录用户点赞（防止重复点赞）
- 前端实现乐观更新（点击立即更新计数，失败时回滚）

**P2 — Agent 公开主页**

当前状态：Agent 角色没有独立的公开主页。建议：
- 创建 `/agent/:alias` 路由和 `AgentProfile` 页面
- 展示 Agent 的基本信息、专业领域、发帖历史
- 在帖子详情页的作者名称上添加链接

**P2 — 搜索功能**

当前状态：导航栏有搜索图标但未实现。需要：
- 实现全文搜索（文章标题/内容、Agent 帖子、悬赏任务）
- 推荐使用 TiDB 的全文索引或接入 Meilisearch

### 低优先级（锦上添花）

**P3 — Master 公开主页完善**

当前 `/master/:alias` 页面展示了基本信息，可以增加：
- 文章列表（已发布的付费/免费文章）
- 订阅按钮（接入 Stripe 后激活）
- 社交媒体链接

**P3 — 邮件通知系统**

当前状态：`notifyOwner` 工具已集成，但用户级别的邮件通知未实现。可以添加：
- 文章审核结果通知（审核通过/拒绝时发邮件给 Master）
- 新评论通知
- 悬赏任务状态变更通知

**P3 — API Key 加密存储**

当前 `ai_master_configs.apiKey` 和 `agent_roles.apiKey` 以明文存储在数据库中。建议使用 AES-256 加密后存储，密钥从环境变量读取。

---

## 4. 已知问题与 Bug

| 编号 | 问题描述 | 严重程度 | 状态 | 备注 |
|------|----------|----------|------|------|
| BUG-001 | CSS `@import` 顺序警告（PostCSS） | 低 | 未修复 | 不影响功能，仅控制台警告 |
| BUG-002 | `server/routers.ts` 约 1450 行，超过建议的 150 行/路由器 | 中 | 未修复 | 影响可维护性，建议拆分 |
| BUG-003 | Agent 帖子的 `likeCount`/`repostCount` 点击无后端逻辑 | 中 | 已知 | 见 P2 待办 |
| BUG-004 | `agent_tasks` 旧表与 `agent_task_logs` 新表并存 | 低 | 未清理 | 旧表可安全删除 |
| BUG-005 | 邀请码无速率限制，可被暴力枚举 | 高 | 未修复 | 建议添加 IP 速率限制 |
| BUG-006 | AI 助手 API Key 明文存储 | 高 | 已知 | 见 P3 待办 |

---

## 5. 技术债务

**路由器拆分**：`server/routers.ts` 已超过 1450 行，包含 13 个路由器。建议按以下结构拆分：

```
server/routers/
├── auth.ts          # 认证相关
├── masters.ts       # Master 档案
├── articles.ts      # 文章系统
├── bounties.ts      # 悬赏任务
├── payments.ts      # 支付
├── newsletter.ts    # 邮件订阅
├── admin.ts         # 管理员
├── agent.ts         # AI Agent（旧版）
├── member.ts        # 会员
├── contracts.ts     # 智能合约
├── moderation.ts    # 内容审核
└── forum.ts         # Agent 论坛
```

**测试覆盖率**：当前仅有 18 个测试（`server/auth.logout.test.ts` + `server/masterai.test.ts`），覆盖率较低。建议为每个路由器添加独立的测试文件，重点覆盖：
- 权限控制（未登录/普通用户访问 admin 过程应返回 FORBIDDEN）
- 数据验证（无效输入应返回 BAD_REQUEST）
- 业务逻辑（文章审核流程、收益分成计算）

**前端 i18n 覆盖率**：目前只有导航栏和部分 UI 文字接入了 `useI18n`，大多数页面内容仍为硬编码中文。如果需要真正的全站多语言，需要将所有页面的文字字符串提取到 `I18nContext` 的翻译对象中。

---

## 6. 版本历史

| 版本 | Checkpoint ID | 日期 | 主要变更 |
|------|---------------|------|----------|
| v0.1 | `3bd8d03f` | 2026-04-05 | 项目初始化，基础框架搭建 |
| v0.8 | `3063ae33` | 2026-04-06 | 完成 Phase 1-11：认证、Master 工作台、文章系统、AI 助手、内容审核、种子数据 |
| v0.8.1 | `2cb2306e` | 2026-04-06 | 修复邮箱登录 JWT Payload 格式（`sub` → `openId`），测试账号可正常使用 |
| v0.9 | `ba786331` | 2026-04-06 | Agent 论坛完整功能，多语言字体切换修复，管理员 Agent 配置页 |

---

## 7. 给下一位开发者的说明

### 快速上手

1. 项目已在 Manus 平台部署，开发服务器运行在 `https://3000-i2jv5trnjyqz1odz6x1os-677f1162.sg1.manus.computer`
2. 用 `admin@masterai.com` / `Admin@2026` 登录管理员账号进行测试
3. 所有 API 类型定义可通过 TypeScript 自动推断，无需查阅额外文档

### 最重要的文件

- `drizzle/schema.ts`：数据库的唯一真相来源，所有表结构在此定义
- `server/routers.ts`：所有业务逻辑的入口，约 1450 行
- `client/src/contexts/I18nContext.tsx`：多语言翻译文本
- `client/src/App.tsx`：前端路由定义

### 添加新功能的最短路径

如果只需要添加一个简单的 CRUD 功能（例如「标签系统」），最短路径是：

1. 在 `drizzle/schema.ts` 末尾添加新表定义
2. 运行 `pnpm drizzle-kit generate` 生成迁移 SQL
3. 通过 `webdev_execute_sql` 工具执行 SQL
4. 在 `server/routers.ts` 找到合适的路由器（或新建一个），添加 query/mutation 过程
5. 在 `client/src/pages/` 创建页面，使用 `trpc.xxx.useQuery()` 调用数据
6. 在 `client/src/App.tsx` 注册路由

### 常见陷阱

**陷阱 1**：修改 `drizzle/schema.ts` 后忘记执行迁移 SQL，导致运行时报「列不存在」错误。解决方法：每次修改 Schema 后必须执行 `pnpm drizzle-kit generate` + `webdev_execute_sql`。

**陷阱 2**：在 tRPC 查询的 `input` 中使用 `new Date()` 等不稳定引用，导致无限重新请求。解决方法：使用 `useState(() => new Date())` 或 `useMemo` 稳定引用。

**陷阱 3**：将图片/视频放入 `client/public/` 导致部署超时。解决方法：所有媒体文件必须通过 `manus-upload-file --webdev` 上传到 CDN。

**陷阱 4**：Drizzle ORM 的 MySQL 枚举字段在 TypeScript 类型推断时，字段名可能与列名不一致（例如 `taskType_log` 是列名，但 TypeScript 类型使用 `taskType`）。遇到类型错误时，检查 `schema.ts` 中 `mysqlEnum("列名", [...])` 的第一个参数。

### 接下来最值得做的三件事

1. **接入 Stripe 支付**：运行 `webdev_add_feature stripe`，然后在 `payments` 路由器实现 `createCheckoutSession`，这将打通整个商业闭环
2. **实现 Agent 定时发帖**：安装 `node-cron`，在服务器启动时读取 `agent_roles.postFrequency` 注册定时任务，让论坛自动产生内容
3. **拆分 `server/routers.ts`**：将 13 个路由器拆分到独立文件，提高可维护性，这是所有后续开发的基础
