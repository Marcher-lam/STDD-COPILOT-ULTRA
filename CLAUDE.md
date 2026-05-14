# STDD Copilot - AI Agent 入口规则

> Version: 1.1 | Last Updated: 2026-05-14

## 概览

STDD Copilot 包含 45 个 /stdd:* 会话入口。

## 入口 taxonomy（防漂移约定）

- 20 个 Command 模板文件 (`src/templates/commands/{name}.md`)
- 38 个 Skill 模板目录 (`src/templates/skills/stdd-{name}/SKILL.md`)
- command-file-backed 入口（20）：`/stdd:init`, `/stdd:new`, `/stdd:propose`, `/stdd:clarify`, `/stdd:confirm`, `/stdd:spec`, `/stdd:plan`, `/stdd:apply`, `/stdd:execute`, `/stdd:verify`, `/stdd:archive`, `/stdd:final-doc`, `/stdd:brainstorm`, `/stdd:issue`, `/stdd:constitution`, `/stdd:ff`, `/stdd:continue`, `/stdd:explore`, `/stdd:graph`, `/stdd:turbo`
- skill-driven 入口（38）：`/stdd:api-spec`, `/stdd:apply`, `/stdd:archive`, `/stdd:certainty`, `/stdd:commit`, `/stdd:complexity`, `/stdd:context`, `/stdd:contract`, `/stdd:design`, `/stdd:factory`, `/stdd:ff`, `/stdd:graph`, `/stdd:guard`, `/stdd:help`, `/stdd:init`, `/stdd:iterate`, `/stdd:learn`, `/stdd:memory`, `/stdd:metrics`, `/stdd:mock`, `/stdd:mutation`, `/stdd:new`, `/stdd:outside-in`, `/stdd:parallel`, `/stdd:prp`, `/stdd:roles`, `/stdd:schema`, `/stdd:spec`, `/stdd:supervisor`, `/stdd:turbo`, `/stdd:user-test`, `/stdd:validate`, `/stdd:vision` 等。
