# Conventions

> Homogeneity makes the codebase predictable for agents. Detected stack: `node`.

## Style

- Follow the standard formatter and linter for `node` (`npm run lint`).
- Descriptive names over clever ones; consistent casing.
- Small, single-purpose functions and files.

## Tests

- One test file per unit. Cover the happy path and at least one failure path.
- Tests are real and isolated — temporary directories, no shared global state.
- Never weaken or delete a test to make the gate pass.
- Run with `the project's test command (set it in reins.config.json)`.

## Commits

- One logical change per commit, Conventional Commits style (`feat:`, `fix:`, `docs:`, `refactor:` …).
- Never commit secrets or generated artifacts.
