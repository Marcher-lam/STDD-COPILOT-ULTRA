# STDD Copilot - Claude Code Guide

> 本指南描述 STDD Copilot 在 Claude Code 环境下的实现细节。

## 文件结构约定

- 命令模板位于 `src/templates/commands/{指令名称}.md`，初始化后写入 `.claude/commands/stdd/{指令名称}.md`
- Skill 模板位于 `src/templates/skills/stdd-{指令名称}/SKILL.md`，初始化后写入 `.claude/skills/stdd-{指令名称}/SKILL.md`

## 核心工作流

核心入口包括 `init`、`new`、`ff`、`continue`、`explore`、`graph` 以及 `apply`、`verify`、`archive` 等。

注意：不要假定 command 模板与 Skill 模板一一对应；当前入口由 20 个 command 模板和 38 个 Skill 模板共同组成，去重后提供 45 个 `/stdd:*` 会话入口。
