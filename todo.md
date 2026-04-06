# Master.AI Project TODO

## Phase 1: Database Schema & Global Theme
- [x] 扩展 drizzle/schema.ts（users扩展、masters、articles、bounties、subscriptions、purchases、invite_codes、email_subscribers、agent_tasks、revenue_splits）
- [x] 全局样式主题（日式物哀美学：Kinari白+Patina铜绿，电路蓝图装饰）
- [x] 安装额外依赖（@uiw/react-md-editor、framer-motion已内置、recharts已内置）
- [x] 配置 Google Fonts（Outfit + Noto Sans SC + Fira Code）

## Phase 2: Backend API
- [x] 邮箱认证（注册/登录/邀请码验证）
- [x] Master API（列表、详情、等级体系）
- [x] 文章 API（CRUD、付费墙、编号生成、阅读统计）
- [x] 悬赏 API（发起、接单、提交、审核、状态流转）
- [x] 订阅 API（Master订阅、月度/年度）
- [x] 购买 API（单篇购买、Stripe集成占位）
- [x] Admin API（用户管理、文章审核、数据统计）
- [x] AI Agent API（任务创建、执行、状态查询）
- [x] 邮件订阅 API

## Phase 3: Public Frontend Pages
- [x] 首页（Hero + Master展示 + 平台规则 + 最新文章）
- [x] 文章列表页（/articles）
- [x] 文章详情页（/article/:code，付费墙）
- [x] 悬赏市场页（/bounties）
- [x] 悬赏详情页（/bounty/:id）
- [x] Master公开主页（/master/:alias）
- [x] 登录/注册页（/login，邮箱+邀请码）
- [x] 定价页（/pricing）
- [x] 关于页（/about）
- [x] 专家入驻说明页（/contributor）
- [x] 导航栏（三语切换、搜索、用户菜单）
- [x] 页脚

## Phase 4: Admin Dashboard
- [x] 管理员仪表盘（/admin，Recharts图表）
- [x] 用户管理（/admin/users，搜索/封禁/角色调整）
- [x] 文章审核（/admin/articles，通过/拒绝）
- [x] 悬赏管理（/admin/bounties，争议处理）
- [x] 邀请码管理（/admin/invite-codes）
- [x] AI Agent 控制台（/admin/agents）

## Phase 5: Master Panel & Member Center
- [x] Master面板（/master/dashboard，收入概览）
- [x] Markdown编辑器（文章写作）
- [x] 文章发布流程（合规检测→提交审核）
- [x] 悬赏接单功能
- [x] Member个人中心（/dashboard）
- [x] 订阅的Master列表+取消订阅
- [x] 已购买文章列表
- [x] 悬赏记录
- [x] 个人信息编辑

## Phase 6: AI Agent System
- [x] AI Agent虚拟Master（全网资料收集）
- [x] 自动撰写文章（LLM集成）
- [x] 内容合规检测
- [x] 自动翻译（中日英三语）
- [x] Agent任务管理界面

## Phase 7: Integration & Seed Data
- [x] 数据库迁移执行
- [x] 种子数据注入（2位Master、3篇文章、2个悬赏、3个邀请码）
- [ ] Stripe支付集成（需要Stripe密钥）
- [ ] 邮件推送通知（可选增强）
- [x] 全流程测试
- [x] Vitest单元测试（18个测试全部通过）

## Phase 8: Navigation Restructure & UI Polish
- [x] 重构导航为四大板块：首页、洞察、订阅、悬赏
- [x] 删除「技术」导航项，合并到「洞察」
- [x] 数字字体改为圆润粗体（Nunito / Rounded）
- [x] 新建洞察页（/insights）：AI Agent驱动的行业新闻汇总
- [x] 新建订阅页（/subscribe）：人工Master专区，展示可订阅的专家列表
- [x] 更新首页Hero区统计数字字体
- [x] 更新 App.tsx 路由配置
- [x] 完善 Master 面板（文章管理列表、编辑、删除）
- [x] 完善 Member 个人中心（订阅管理、已购文章、悬赏记录）

## Phase 9: 邮件订阅系统（Phase 1 核心目标）
- [x] 邮件订阅后端 API（订阅/取消订阅/发送通知/统计）
- [x] 首页 Hero 区邮件订阅框
- [x] 文章详情页底部订阅框
- [x] 洞察页顶部订阅框
- [x] 订阅页订阅框
- [x] 管理员后台订阅者管理页面（列表/搜索/导出/批量发送）
- [x] 文章发布时自动通知订阅者
- [x] 取消订阅页面（/unsubscribe?token=xxx）
- [x] 订阅成功确认提示
