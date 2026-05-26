# /stdd:codegraph

维护 STDD 默认代码知识图谱。通常不需要主动调用：

- `stdd init` 会自动创建或扫描初始图谱。
- `stdd context` 默认加载 `stdd/memory/codegraph.md`。
- Claude Code 写源码文件后，PostToolUse hook 会非阻塞同步单文件。

## CLI

```bash
stdd codegraph status --json
stdd codegraph rebuild --json
stdd codegraph sync --file src/foo.ts --json
stdd codegraph sync --changed --json
stdd codegraph query "auth" --json
```

## 输出

- `stdd/graph/codegraph/index.json`
- `stdd/graph/codegraph/nodes.json`
- `stdd/graph/codegraph/edges.json`
- `stdd/memory/codegraph.md`
