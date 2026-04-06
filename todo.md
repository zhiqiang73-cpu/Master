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
- [ ] Stripe支付集成（需要Stripe密钥，Phase 2 实现）
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

## Phase 10: 修复与功能完善（用户反馈）
- [x] 修复邀请码页面404（/admin/invite-codes 路由）
- [x] 修复 Master 公开主页（/master/:alias 页面路由顺序）
- [x] 全站多语言切换（中/英/日），字体联动（Noto Sans SC / Noto Serif JP / Inter）
- [x] 管理员账号说明（Manus OAuth 自动识别 Owner 为 Admin）
- [x] 内容自动脱敏机制（LLM 合规检测自动触发于提交审核流程）
- [x] 智能合约模块（早期发现者分成、文章收益权记录）
- [x] 头像上传功能（S3 存储 + 个人资料编辑）
- [x] AI Master 多模型 API 配置（Qwen/GLM/MiniMax 等入口）
- [x] AI Master 个性化提示词配置
- [x] Master 用户可创建 AI Master 的权限（AI 助手 Tab）
- [x] Master 收入一览表（预留面板）

## Phase 11: 最终完善
- [x] 种子数据：管理员账号 admin@masterai.com / Admin@2026
- [x] 种子数据：测试 Master 账号 master1@test.com / Master@123
- [x] 种子数据：测试用户账号 member1@test.com / Member@123
- [x] 种子数据：邀请码 MASTER2026 / SEMI2026 / EARLYBIRD
- [x] 内容审核自动集成到文章提交流程
- [x] 18 个 Vitest 测试全部通过
- [x] TypeScript 零错误

## Phase 12: Agent 论坛（机器人世界）
- [ ] 修复多语言切换（全站文字同步切换，字体联动）
- [ ] 数据库：agent_posts 表（帖子：标题、内容、类型、作者 agentId）
- [ ] 数据库：agent_comments 表（评论：帖子 id、作者 agentId、内容、回复 id）
- [ ] 数据库：agent_roles 表（角色：名称、头像、人设提示词、模型配置、调度频率）
- [ ] 后端 API：Agent 角色 CRUD（管理员专用）
- [ ] 后端 API：Agent 发帖任务（手动触发 + 定时调度）
- [ ] 后端 API：Agent 评论/互评任务
- [ ] 后端 API：帖子列表、详情、评论列表
- [ ] 前端：Agent 论坛页面（/forum，帖子流 + 类型筛选 + 评论展开）
- [ ] 前端：帖子详情页（/forum/:id，评论树）
- [ ] 前端：管理员后台 Agent 配置页（/admin/agents，角色管理 + 任务触发）
- [ ] 导航更新：洞察 → Agent 论坛（三语）
- [ ] 多语言翻译补充（Agent 论坛相关文本）

## Phase 15: 替身头像修复
- [x] 首页移除替身大卡片，改为简洁双引擎介绍布局
- [x] 替身板块（/stand）替身以圆形小头像展示
- [x] 全站替身头像统一为圆形样式

## Phase 16: 替身功能完善
- [ ] 首页标题压缩为一行（不换行）
- [ ] 删除替身板块 JOJO 相关描述文字
- [ ] 替身互评：替身中心触发评论功能
- [ ] 替身定时发帖：cron 调度配置
- [ ] JOJO 头像 AI 生成：创建替身时自动生成

## Phase 17: 替身拟人化系统
- [ ] 数据库：agentRoles 添加 personalityTags、interestTags、cronSchedule 字段
- [ ] 数据库：agentPosts 添加 hashtags 字段
- [ ] 后端：标签相互吸引算法（重叠度计算 + 触发概率）
- [ ] 后端：Cron 定时发推调度器（node-cron）
- [ ] 后端：事件驱动评论触发（发推后自动触发其他替身评论）
- [ ] 后端：Twitter 风格推文生成（140-280字，带#标签，性格化语气）
- [ ] 后端：回复时引用原推内容
- [ ] 前端：替身创建表单添加性格标签/关注点标签/Cron配置
- [ ] 前端：替身板块 Twitter 风格推文流
- [ ] 前端：嵌套回复链展示（最多3层）
- [ ] 修复首页标题换行问题
- [ ] 删除替身板块 JOJO 描述文字

## Phase 18: Stand Engine 完整集成（当前阶段）
- [x] standEngine.ts：标签匹配算法（calcAttractionScore + shouldReply）
- [x] standEngine.ts：Twitter 风格推文生成（generateTweet + generateReply）
- [x] standEngine.ts：事件驱动评论触发（triggerEventDrivenComments，延迟 5-30 分钟）
- [x] standEngine.ts：Cron 调度器（scheduleStand + unscheduleStand + initStandScheduler）
- [x] server/_core/index.ts：服务器启动时自动初始化所有活跃替身的 Cron 调度
- [x] server/routers.ts：createRole/updateRole/createMasterStand 支持 personalityTags/interestTags/postFrequency/replyProbability
- [x] server/routers.ts：runForumAgentAsync 集成 generateTweet（flash/discussion 类型）
- [x] server/routers.ts：runForumAgentAsync 发帖后自动触发 triggerEventDrivenComments
- [x] server/routers.ts：导出 runForumAgentFromScheduler 供 Cron 调度器调用
- [x] AdminStandCenter.tsx：性格标签输入（TagInput 组件 + 预设快选）
- [x] AdminStandCenter.tsx：关注点标签输入（TagInput 组件 + 预设快选）
- [x] AdminStandCenter.tsx：发帖频率 Cron 下拉选择（预设 + 自定义）
- [x] AdminStandCenter.tsx：回复概率配置（0-100%）
- [x] server/standEngine.test.ts：4 个单元测试（标签匹配算法验证）
- [x] 22 个 Vitest 测试全部通过（新增 4 个 Stand Engine 测试）
- [x] TypeScript 零错误

## Phase 19: Master 替身重构为专属情报官+内容创作引擎
- [ ] 数据库：agentRoles 新增 intelligenceSources（情报源URL列表）、outputFormats（支持格式：article/ppt/pdf/chart）、triggerMode（manual/scheduled/keyword）、triggerKeywords、autoMode 字段
- [ ] 后端 API：updateRole（编辑替身，管理员+Master均可用）
- [ ] 后端 API：toggleAutoMode（开关自动模式）
- [ ] 后端 API：runIntelligenceTask（情报收集：爬取指定源+公开平台，返回摘要）
- [ ] 后端 API：generateContent（内容生成：article/ppt/pdf/chart，基于情报+关键词）
- [ ] 管理员替身中心：编辑替身对话框（所有字段可修改）
- [ ] 管理员替身中心：自动模式开关（isActive toggle）
- [ ] Master 面板：合并「AI 助手」和「我的替身」Tab 为「专属情报官」
- [ ] Master 面板：情报官配置（专业标签、情报源、触发模式、输出格式）
- [ ] Master 面板：情报任务触发界面（关键词输入 + 立即收集）
- [ ] Master 面板：内容生成界面（选择格式 + 生成 + 预览/下载）
- [ ] Master 面板：删除「内置模型（无需配置）」选项
- [ ] 全站删除 builtin 模型选项

## Phase 20: AI Master 与情报官配置联动
- [x] 分析 AI Master 配置数据结构（masterAiConfigs 表）
- [x] 后端新增 syncAiMasterToStand procedure
- [x] AI Master 配置页面新增「同步到情报官」按钮
- [x] 情报官面板显示「前往同步」快捷入口（蓝色提示条）
- [x] 同步逻辑：人格→personality、专业领域→specialty、研究方向→interestTags、提示词→systemPrompt
- [x] 删除 AI Master 配置页面的「内置 LLM」选项

## Phase 21: 替身页重构 + Master 资料修复
- [x] 修复 Master 资料编辑（名字、专业领域、bio 字段保存）
- [x] 修复注册成功后跳转（自动登录并跳转到首页）
- [x] 替身页面重构为 Substack 风格互动流（嵌套回复、点赞、图片灯笜、过滤标签）
- [x] 后端新增 likePost 和 uploadPostImage 接口
- [x] 数据库新增 imageUrls 字段（agentPosts 表）
- [x] 左侧栏替身名单（可按替身过滤）
- [x] 替身头像 + 名字 + 时间戳显示
- [x] 帖子互动栏（点赞、回复、分享计数）
