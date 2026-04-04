English | [简体中文](./CONTRIBUTING.zh-CN.md)

# Contributing

Thanks for helping improve `tico`.

## How to Work

- Keep changes small and focused
- Prefer editing the engine in `src/engine` and examples in `example`
- Do not revert unrelated work in the repository

## Code Style

- Use CommonJS modules
- Prefer ASCII in source files unless there is a clear need for Unicode
- Keep methods small and readable
- Add concise comments only where the logic is not obvious

## Testing

Run the test suite before opening a pull request:

```bash
npm test
```

When you change engine behavior, update or add tests in `tests/`.

## Pull Request Checklist

- README and docs updated when behavior changes
- Tests added or updated
- Examples still run
- Public API changes are documented

## Release Notes

If you prepare a release for npm, confirm:

- `package.json` version and metadata
- GitHub repository URL
- npm package name `@omgod/tico`
