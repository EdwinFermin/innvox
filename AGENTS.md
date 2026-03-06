# Context Protocol

This repository uses a strict context-selection workflow so model calls do not include the whole project.

## Rules

1. Never read the full repository for a single task.
2. Start with targeted discovery (`glob`/`grep`), then include only relevant files.
3. Respect `.contextignore` for all context gathering.
4. Default context budget per call:
   - max files: `10`
   - max output chars: `12000`
5. Prefer snippets over full files when possible.
6. Every included file must have a one-line reason.

## Workflow

1. Generate or refresh repository map:

```bash
npm run context:map
```

2. Build a task-scoped context pack:

```bash
npm run context:pack -- --query "<task here>" --budget 12000 --max-files 10
```

3. Use the produced pack instead of sending full repo context.

## Optional Scope

Use `--scope` to constrain search:

```bash
npm run context:pack -- --query "fix invoice export" --scope src/app,src/hooks
```

## Outputs

- `npm run context:map` writes `.cache/context/repo-map.json`
- `npm run context:pack` writes:
  - `.cache/context/last-pack.md`
  - `.cache/context/last-pack.json`
