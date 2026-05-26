---
id: stdd.game-dev
command: /stdd:game-dev
description: 游戏开发专用工作流：ECS 架构、Game Loop 规格、Playtesting、资源管线
version: "1.0"
category: vertical
phase: all
read_only: false
risk_level: medium
supports:
  greenfield: true
  brownfield: true
  monorepo: false
depends_on: [stdd.spec]
next: [stdd.apply, stdd.verify]
on_failure: []
inputs:
  - specs/
  - game-design-doc.md
  - asset-manifest.json
outputs:
  - stdd/game/
  - stdd/game/architecture.md
  - stdd/game/frame-budgets.md
  - stdd/game/playtest-reports/
---

# STDD Game Dev Module

游戏开发专用垂直模块，将 STDD 的 Spec/TDD 工程控制体系适配到游戏开发场景。

## 核心能力

### 1. ECS Architecture Spec (Entity-Component-System)

生成 ECS 架构规格文档：

```markdown
## Entity Definitions
- Player: [Position, Velocity, Health, Input, Sprite]
- Enemy: [Position, Velocity, Health, AI, Sprite]
- Projectile: [Position, Velocity, Damage, Lifetime]

## System Pipeline (per frame)
1. InputSystem → reads Input, writes Velocity
2. PhysicsSystem → reads Position+Velocity, writes Position
3. CollisionSystem → reads Position+Collider, writes CollisionEvents
4. AISystem → reads AI+Position, writes Velocity
5. RenderSystem → reads Position+Sprite, draws frame
```

### 2. Game Loop Spec

定义帧预算和更新频率：

| System | Budget (ms) | Priority | Thread |
|--------|-------------|----------|--------|
| Input | 0.5 | Critical | Main |
| Physics | 2.0 | Critical | Main |
| AI | 1.5 | High | Worker |
| Render | 10.0 | Critical | Main |
| Audio | 1.0 | Medium | Worker |
| Network | 2.0 | High | Worker |

**Target**: 60 FPS = 16.67ms total frame budget

### 3. Playtesting Evidence

替代传统 TDD 证据链的游戏验证方式：

```
Playtest Report:
- Scenario: Boss fight phase 2
- Duration: 45 seconds
- FPS: avg 58, min 42, max 60
- Player deaths: 3 (expected 2-5)
- Bug found: Collision box too large on boss arm
- Fun rating: 7/10 (playtester feedback)
```

### 4. Asset Pipeline Validation

验证资源完整性：

```json
{
  "assets": {
    "sprites": { "expected": 45, "found": 43, "missing": ["enemy_boss_phase2.png", "explosion_large.png"] },
    "audio": { "expected": 12, "found": 12 },
    "animations": { "expected": 20, "found": 20 }
  }
}
```

### 5. State Machine Testing

游戏状态机的 TDD 覆盖：

```javascript
describe('GameStateMachine', () => {
  it('transitions Menu → Loading → Gameplay on Start', () => { ... });
  it('pauses on Pause button during Gameplay', () => { ... });
  it('transitions Gameplay → GameOver when health reaches 0', () => { ... });
  it('preserves state across save/load cycle', () => { ... });
});
```

## 工作流程

### 初始化

```
/stdd:game-dev init
```

生成 `stdd/game/` 目录结构：
- `architecture.md` — ECS 架构定义
- `frame-budgets.md` — 帧预算分配
- `playtest-reports/` — Playtest 报告存储
- `asset-manifest.json` — 资源清单验证

### 架构评审

```
/stdd:game-dev review
```

检查：
- Entity 组件依赖是否形成循环
- System 执行顺序是否满足依赖
- 帧预算是否超限
- 资源是否齐全

### Playtest 记录

```
/stdd:game-dev playtest --scenario "boss-fight" --duration 60
```

生成结构化 playtest 报告，包含 FPS 统计、bug 记录、体验评分。

### 与 STDD 集成

game-dev 模块与 STDD 核心完全集成：
- `/stdd:spec` 可以引用 `stdd/game/architecture.md` 作为规格输入
- `/stdd:verify` 自动检查帧预算和状态机测试
- `/stdd:constitution` Article 1 覆盖到 playtest evidence
- `/stdd:roles consult shield` 分析游戏安全（反作弊）
- `/stdd:roles consult luna` 评估游戏 UX 和手感

## 支持的引擎

| Engine | Config Format | Auto-detect |
|--------|--------------|-------------|
| Unity | `.csproj` + `Assets/` | Yes |
| Unreal | `.uproject` + `Content/` | Yes |
| Godot | `project.godot` | Yes |
| Custom/JS | `package.json` with game libs | Partial |

## 注意事项

- Playtest evidence 不能完全替代 unit test，关键逻辑仍需自动化测试
- 帧预算是目标值，实际性能需要真机测试
- 资源管线验证不包含运行时加载检查，需要集成测试补充
