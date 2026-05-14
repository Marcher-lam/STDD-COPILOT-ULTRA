# STDD Copilot 修复跟踪

> 根据审阅报告逐条修复，每修复一条更新本文件

---

## P0 修复（必须立即修复）

### ✅ P0-1: apply 无测试命令时不静默标记完成
- **问题**:`apply.js` 第 284-286 行，Legacy Mode 下无测试命令时将任务标记 `[x]` 并退出 0
- **影响**: TDD 的核心承诺被破坏——没有测试也能完成
- **涉及文件**:`src/cli/commands/apply.js`
- **测试文件**:`__tests__/apply-command.test.js`
- **修复内容**:
  - 无测试命令时现在标记为失败并退出 1，要求配置测试命令
  - 任务状态保持为 pending，不被错误标记为完成
  - 记录错误日志到 apply.log

### ✅ P0-2: Security scanner 添加 skip list (node_modules, .git, dist, build)
- **问题**:`constitution-checker.js` 的 scanDir 递归扫描整个项目目录，包括 node_modules 等
- **影响**: 大项目的性能炸弹，扫描数千无关文件导致严重延迟
- **涉及文件**:`src/cli/commands/constitution-checker.js`
- **修复内容**:
  - 新增 `SKIP_DIRS` 集合，跳过 `node_modules`, `.git`, `dist`, `build`, `coverage`, `.next`, `.nuxt`, `.cache`, `out`, `vendor`, `target`, `bin`, `obj`, `.parcel-cache`
  - 新增 `skipFiles` 列表，跳过 `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`, `Gemfile.lock`

### ✅ P0-3: --test-command 命令注入防护
- **问题**:`apply.js` 和 `command-runner` 直接将 `--test-command` 参数传递给 `child_process.spawnSync`
- **影响**: `stdd apply --test-command "rm -rf / && npm test"` 可以执行任意命令
- **涉及文件**:`src/utils/command-runner.js`
- **修复内容**:
  - 新增 `isDangerous()` 函数检测危险命令模式（`rm -rf`, `eval`, `exec$()`, `shred`, `mkfs`, `dd if=`, 等）
  - 新增 `validateCommand()` 函数检测 Shell 注入模式（`|`, `&&`, `;`, `$`, backtick, `>`）
  - 新增 `SAFE_TEST_BINS` 白名单用于允许的测试运行器

### ✅ P0-4: verify lint 失败影响健康检查
- **问题**:`verify.js:214-216` lint 失败时只输出 warning，不设置 `healthy = false`
- **影响**: `stdd verify --lint` 即使 lint 失败也返回通过
- **涉及文件**:`src/cli/commands/verify.js`
- **测试文件**:`__tests__/verify-command.test.js`
- **修复内容**:
  - lint 失败时设置 `healthy = false`
  - 报告表格中 Lint 行显示 `FAIL` 而非 `WARN`
  - verify 整体返回失败状态（exit 1）

---

## P1 修复（严重影响核心体验）

### ✅ P1-2: CLI 命令命名规范统一
- **问题**:`tdd:init` 使用冒号分隔，其他多词命令使用横杠（`api-spec`, `outside-in` 等）
- **影响**: 命令命名风格不一致，用户学习成本增加
- **涉及文件**:`cli.js`, `__tests__/cli-help-output.test.js`, `stdd/config/engines.yaml` 等
- **修复内容**:
  - `tdd:init` → `tdd-init`（统一横杠格式）
  - 斜杠命令保持 `/stdd:xxx` 格式不变（Claude Code 规范）
  - 最终所有 CLI 子命令统一为横杠：`tdd-init`, `api-spec`, `outside-in`, `user-test`, `fix-packet`, `baby-steps`
  - 同步更新测试用例

### ✅ P1-1: README 区分 CLI 命令和 AI 斜杠命令
- **问题**: README 将 15+ 个 AI 斜杠命令伪装为 CLI 命令
- **影响**: 用户安装后运行这些命令发现不存在，严重体验断层
- **涉及文件**:`README.md`
- **测试文件**:`__tests__/docs-taxonomy-consistency.test.js`
- **修复内容**:
  - 明确区分 CLI 命令（`stdd xxx`）和 AI 斜杠命令（`/stdd:xxx`）
  - 核心流程表中同时显示斜杠命令和 CLI 等价命令
  - 新增入口列（CLI / AI）标识每个命令的执行方式
  - 完整覆盖 58 个 canonical slash entries 以确保 taxonomy 测试通过

---

## 修复总结

### 已完成 (6 项)

| 问题 | 优先级 | 状态 |
|------|--------|------|
| P0-1: apply 无测试命令时不静默完成 | P0 | ✅ |
| P0-2: Security scanner 添加 skip list | P0 | ✅ |
| P0-3: --test-command 命令注入防护 | P0 | ✅ |
| P0-4: verify lint 失败影响健康检查 | P0 | ✅ |
| P1-1: README 区分 CLI 和 AI 斜杠命令 | P1 | ✅ |
| P1-2: CLI 命令命名规范统一 (横杠) | P1 | ✅ |

### 测试状态 (当前)

```
Test Suites: 61 passed, 61 total
Tests:       764 passed, 764 total
Snapshots:   0 total
Time:        ~8s
```

**所有测试通过**，零失败。

### 核心改进

1. **TDD 纪律强制执行**: 无测试命令时 apply 现在失败（而不是静默跳过）
2. **命令注入防护**: 危险命令和 Shell 注入被检测并拒绝
3. **安全扫描优化**: 性能提升，跳过 `node_modules` 等目录
4. **Lint 门禁**: verify 现在正确反映 lint 失败
5. **文档透明度**: README 清晰区分 CLI 和 AI 执行入口
