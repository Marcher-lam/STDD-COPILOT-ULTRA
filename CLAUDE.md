# STDD Copilot - AI Agent 入口规则

> Version: 1.3 | Last Updated: 2026-05-19

## 概览

STDD Copilot 包含 47 个 /stdd:* 会话入口。

## 质量基线（2026-05-19）

| 指标 | 数值 |
|------|------|
| 测试套件 | 171 |
| 测试用例 | 3810 |
| 通过率 | 100% |
| 语句覆盖 | 97.33% |
| 分支覆盖 | 91.03% |
| 函数覆盖 | 97.15% |
| 行覆盖 | 97.87% |
| 命令文件 | 58 |
| Skill 模板 | 47 |
| Command 模板 | 20 |

## 入口 taxonomy（防漂移约定）

- 20 个 Command 模板文件 (`src/templates/commands/{name}.md`)
- 47 个 Skill 模板目录 (`src/templates/skills/stdd/{name}/SKILL.md`)
- command-file-backed 入口（20）：`/stdd:init`, `/stdd:new`, `/stdd:propose`, `/stdd:clarify`, `/stdd:confirm`, `/stdd:spec`, `/stdd:plan`, `/stdd:apply`, `/stdd:execute`, `/stdd:verify`, `/stdd:archive`, `/stdd:final-doc`, `/stdd:brainstorm`, `/stdd:issue`, `/stdd:constitution`, `/stdd:ff`, `/stdd:continue`, `/stdd:explore`, `/stdd:graph`, `/stdd:turbo`
- skill-driven 入口（47）：`/stdd:api-spec`, `/stdd:apply`, `/stdd:archive`, `/stdd:brainstorm`, `/stdd:certainty`, `/stdd:clarify`, `/stdd:commit`, `/stdd:complexity`, `/stdd:confirm`, `/stdd:constitution`, `/stdd:context`, `/stdd:continue`, `/stdd:contract`, `/stdd:design`, `/stdd:execute`, `/stdd:explore`, `/stdd:factory`, `/stdd:ff`, `/stdd:final-doc`, `/stdd:fix-packet`, `/stdd:graph`, `/stdd:guard`, `/stdd:help`, `/stdd:init`, `/stdd:issue`, `/stdd:iterate`, `/stdd:learn`, `/stdd:memory`, `/stdd:metrics`, `/stdd:mock`, `/stdd:mutation`, `/stdd:new`, `/stdd:outside-in`, `/stdd:parallel`, `/stdd:plan`, `/stdd:product-proposal`, `/stdd:propose`, `/stdd:prp`, `/stdd:roles`, `/stdd:schema`, `/stdd:spec`, `/stdd:supervisor`, `/stdd:turbo`, `/stdd:user-test`, `/stdd:validate`, `/stdd:verify`, `/stdd:vision`

# currentDate
Today's date is 2026/05/19.
