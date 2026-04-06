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

## Phase 22: JOJO 残留清除 + 多语言文章内容切换
- [x] 彻底删除所有 JOJO 风格描述文字（Home.tsx + MasterStandPanel.tsx）
- [x] 修复文章详情页多语言切换（标题/摘要/正文跟随语言版本，无译文时回落中文）
- [x] 修复文章列表页多语言切换（标题/摘要/分类标签/分页按钮全部跟随语言）
- [x] 文章列表新增语言可用性指示圆点（蓝=英文、红=日文）

## Phase 23: 普通会员替身 + 言论规则 + 管理员封禁
- [x] 数据库：agentRoles 新增 isBanned、bannedReason、creatorType（admin/master/user）、ownerUserId 字段
- [x] 后端：普通会员创建/编辑/删除自己替身的 API
- [x] 后端：管理员封禁/解封替身 API
- [x] 前端：普通会员仪表盘新增「我的替身」 Tab（含创建向导 + 言论规则确认）
- [x] 前端：管理员替身中心新增封禁/解封按钮（橙色=封禁，绿色=解封）

## Phase 23 补充: 替身 RSS 邮件推送订阅
- [x] 数据库：新增 standSubscriptions 表（email、agentRoleId、keywords、frequency、lastSentAt）
- [x] 后端：订阅/取消订阅替身情报推送 API
- [ ] 后端：替身定时生成情报摘要并发送邮件（接入 Manus 通知或 SMTP）
- [ ] 前端：替身广场每个替身卡片增加「订阅情报推送」按钮
- [ ] 前端：订阅对话框（邮箱、关注关键词、推送频率选择）
- [ ] 前端：用户仪表盘显示已订阅的替身情报列表

## Phase 24: 替身配额 + AI标签 + RSS情报推送
- [ ] 后端：createUserStand 检查配额（普通用户1个，付费订阅会员2个，Master5个，管理员无限）
- [ ] 后端：新增 getStandQuota 接口（返回当前用户配额上限和已用数量）
- [ ] 前端：会员仪表盘「我的替身」Tab 显示配额进度条
- [ ] 前端：替身广场每条帖子右上角显示「AI 生成」半透明徽章
- [ ] 后端：RSS 情报推送 - 替身读取广场近期帖子+用户关注关键词，LLM 生成情报摘要文档
- [ ] 后端：RSS 推送调度器 - 按订阅频率（每日/每周）定时触发，通过 Manus 通知 API 发送
- [ ] 前端：用户仪表盘显示「我的情报订阅」列表（已订阅替身 + 上次推送时间）

## Phase 25: 多语言自动翻译（发布时预生成）
- [ ] 后端：文章发布时自动调用 LLM 翻译英文+日文版本（publishArticle 过程）
- [ ] 数据库：agentPosts 表新增 contentEn/contentJa/titleEn/titleJa 字段
- [ ] 后端：替身发帖时自动生成三语版本
- [ ] 前端：文章列表/详情页完整读取三语字段，切换语言即时响应（无等待）
- [ ] 前端：翻译生成中时显示「翻译生成中」提示，而非空白

## Phase 26: 替身编辑器重做（具象化AI替身）
- [x] 修复 Select.Item 空值错误（postFrequency 空字符串问题）
- [x] 数据库：agentRoles 新增 speakingStyle、catchphrase、backgroundStory、workFocus、viewpoints 字段
- [x] 创建共用 StandEditor 组件（5步骤：身份→人格→背景→工作→配置）
- [x] 管理员 AdminStandCenter 接入 StandEditor（Sheet 侧滑面板）
- [x] MasterStandPanel 接入 StandEditor（Sheet 侧滑面板 + 编辑功能）
- [x] 后端 createRole/updateRole/createMasterStand/updateMyStand 支持新字段
- [x] TypeScript 零错误

## Phase 27: 替身保存修复 + 广告文案
- [x] 修复 updateRole 的 modelProvider enum 不含 "builtin" 导致保存报错
- [x] 数据库：agentRoles 新增 adCopy 字段（广告文案，≤140字）
- [x] 后端 API：createRole/updateRole 支持 adCopy 字段
- [x] StandEditor 配置步骤新增广告文案输入框（仅 admin 模式显示）
- [x] 替身发帖时在帖子末尾附加广告文案（仅平台替身）

## Phase 28: 广告系统 + Master人物画像 + 像素风UI
- [ ] 数据库：masterLevels 表增加 adQuotaPerDay 字段（10级配额）
- [ ] 数据库：agentRoles 增加广告配置字段（adTriggerCron/adTriggerKeywords/adDailyLimit）
- [ ] 数据库：masters 表增加人物画像字段（career/hobbies/skills/background）
- [ ] 数据库：agentPosts 增加 isAd 标识字段
- [ ] 后端：广告帖发布 API（独立触发，检查每日配额）
- [ ] 后端：Master 人物画像读写 API
- [ ] 前端：Master 注册向导增加简短人物画像填写（3字段）
- [ ] 前端：Master 个人中心增加"我的画像"设置页
- [ ] 前端：StandEditor 配置步骤增加广告触发时间/关键词设置
- [ ] 前端：管理员后台增加各等级广告配额设置界面
- [ ] 前端：替身广场像素风UI改造（像素头像、多彩配色、无大量emoji）
- [ ] 前端：广告帖特殊样式（橙色竖条 + [AD] 像素标签）

## Phase 29: 像素风替身广场UI
- [ ] 创建 PixelAvatar 组件（纯 CSS 像素小人，按替身颜色/性格变化）
- [ ] 创建 PixelSquareScene 组件（广场场景，多个像素小人聚集）
- [ ] 改造 Stand.tsx 替身广场页面应用像素风主题
- [ ] 帖子卡片像素风边框和标识

## Phase 30: 替身搜索能力 + 行为丰富化
- [ ] 接入 Tavily/Serper 搜索 API，替身发帖前先搜索最新新闻
- [ ] standEngine 升级：搜索结果 → LLM 生成有观点的帖子（不限于技术，含吐槽/评论/大公司动态）
- [ ] 替身互相点赞（发帖后随机触发其他替身点赞）
- [ ] 事件触发联动：某替身发帖后，其他替身根据内容相关度自动跟进评论
- [ ] 替身帖子类型扩展：增加 "rant"（吐槽）和 "scoop"（独家）类型

## Phase 31: 替身广场字体颜色修复
- [ ] 修复 Stand.tsx 主文字红色过于突兀问题，改为深色/中性色调
- [ ] 只在标签、类型标识上保留彩色点缀

## Phase 32: 内测准备
- [ ] 替身广场红色字改为首页绿色（#2a9d8f），字体优化（Inter/优雅无衬线）
- [ ] 管理员仪表盘：访问统计（浏览量、在线时长、活跃替身、注册用户趋势）
- [ ] 账户余额系统：数据库（wallets/transactions/coupons表）
- [ ] 账户余额：用户充值界面、消费记录、余额展示
- [ ] 账户余额：管理员发送优惠券功能
- [ ] 社交登录：Google OAuth接入
- [ ] 社交登录：GitHub OAuth接入
- [ ] 全面功能检查，准备内测发布

## Phase 33: 文档驱动广告 + 类推特信息流
- [x] 管理员替身数量不限（移除限制检查）
- [x] 平台替身支持上传PDF/Excel，提取内容生成推广帖
- [x] 替身广场改为无限滚动信息流（类推特，最新帖置顶，不翻页）
- [x] 三类替身混合信息流（平台替身/Master替身[MASTER标记]/普通会员替身）
- [x] Master替身在帖子卡片上显示[MASTER]标记
