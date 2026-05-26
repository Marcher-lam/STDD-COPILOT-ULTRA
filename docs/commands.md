# Commands Reference

## CLI 命令速查
stdd init
stdd init /path/to/project
stdd init --force
stdd list
stdd list --specs
stdd list --archived
stdd list --json
stdd status
stdd status add-dark-mode
stdd new change add-dark-mode
stdd skills
stdd commands
stdd constitution
stdd constitution show 2
stdd constitution check
stdd hooks install
stdd hooks verify
stdd hooks status
stdd hooks disable
stdd hooks enable
stdd progress
stdd progress --summary
stdd progress --resume
stdd progress --json
stdd progress --clear

## 斜杠命令清单 (88 Command Templates + 57 Skill Templates)

/stdd:api-spec /stdd:apply /stdd:archive /stdd:audit /stdd:baby-steps /stdd:brainstorm /stdd:browser /stdd:builder /stdd:certainty /stdd:ci /stdd:ci-generator /stdd:clarify /stdd:codegraph /stdd:commands /stdd:commit /stdd:commit-msg /stdd:commit-tdd /stdd:complexity /stdd:confirm /stdd:constitution /stdd:context /stdd:context-engine /stdd:continue /stdd:contract /stdd:dashboard /stdd:depcheck /stdd:design /stdd:doctor /stdd:docs /stdd:elicitation /stdd:execute /stdd:explore /stdd:extensions /stdd:factory /stdd:ff /stdd:final-doc /stdd:fix-packet /stdd:game-dev /stdd:graph /stdd:graph-history /stdd:graph-run /stdd:guard /stdd:help /stdd:hooks /stdd:init /stdd:issue /stdd:iterate /stdd:learn /stdd:list /stdd:memory /stdd:memory-scan /stdd:metrics /stdd:mock /stdd:mock-gen /stdd:modules /stdd:mutation /stdd:new /stdd:outside-in /stdd:parallel /stdd:party-mode /stdd:pipeline /stdd:plan /stdd:prfaq /stdd:profile /stdd:prp /stdd:product-proposal /stdd:progress /stdd:propose /stdd:recommend /stdd:roles /stdd:runtime /stdd:schema /stdd:skills /stdd:spec /stdd:spec-generator /stdd:start /stdd:starters /stdd:status /stdd:story /stdd:sudo /stdd:supervisor /stdd:tdd-init /stdd:turbo /stdd:ui /stdd:update /stdd:user-test /stdd:validate /stdd:verify /stdd:vision /stdd:waiver-manager /stdd:workspace

## Graph Runtime 补强

- feature intent: `stdd-propose → stdd-spec → stdd-plan → stdd-outside-in → stdd-apply → stdd-verify`
- repair intent: `stdd-fix-packet → stdd-apply → stdd-verify`
- `stdd fix-packet [change]` 生成 Golden Packet 风格失败修复上下文；`stdd apply` 测试失败时自动生成。
- `stdd outside-in init/scaffold/status` 生成外向内 TDD registry 与分层测试骨架。

## Ultra 增强命令 (Phase 2-4 新增)

### Builder & 代码生成
- `stdd builder create` — 创建自定义 Agent、Workflow、Skill
- `stdd builder list` — 列出已创建的构建产物

### UI 生成
- `stdd ui create` — 基于 DESIGN.md 设计令牌生成前端页面和组件
- `stdd ui list` — 列出已生成的 UI 产物

### 模块市场
- `stdd modules search` — 搜索社区模块
- `stdd modules install` — 安装社区模块
- `stdd modules list` — 列出已安装模块

### 可视化 & 文档
- `stdd dashboard generate` — 生成静态 HTML 项目健康仪表板
- `stdd dashboard open` — 在浏览器中打开仪表板
- `stdd docs build` — 从项目文档生成静态文档站点
- `stdd docs serve` — 启动文档站点本地预览服务

### 智能规划
- `stdd profile detect` — 按项目复杂度自动检测规划深度
- `stdd profile set` — 手动设置规划深度等级

### PRFAQ 工作流
- `stdd prfaq ignition` — Amazon Working Backwards PRFAQ 起步
- `stdd prfaq press-release` — 生成新闻稿
- `stdd prfaq full` — 生成完整 PRFAQ 文档

### 代码知识图谱
- `stdd codegraph inspect` — 检查代码关系和依赖
- `stdd codegraph query` — 查询代码图谱
- `stdd codegraph update` — 更新代码知识图谱

### 迭代循环
- `stdd iterate plan` — Plan-Execute-Reflect 规划阶段
- `stdd iterate execute` — 执行迭代任务
- `stdd iterate reflect` — 反思与质量提升

### 并行执行
- `stdd parallel execute <intent>` — DAG 意图并行执行

### 快速启动
- `stdd start` — 交互式快速启动向导
- `stdd recommend` — 根据项目状态推荐下一步操作

## 文档导航
- [项目首页](../README.md) - 项目概览和顶层示例
- [使用手册](../USAGE.md) - 完整使用指南
- [快速开始](getting-started.md) - 首次使用流程和 CLI 速查
- [CLI 使用指南](cli-guide.md) - CLI 完整文档
- [工作流程](workflows.md) - 常见工作流程
- [核心概念](concepts.md) - 深入理解 specs、changes 和 schemas
- [命令参考](commands.md) - 统一会话入口参考
- [英文文档入口](en/README.md) - English docs index
