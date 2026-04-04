[English](./CONTRIBUTING.md) | 简体中文

# 贡献指南

感谢你为 `tico` 贡献代码、文档或反馈。

## 开发方式

- 保持改动小而聚焦
- 优先修改 `src/engine` 和 `example`
- 不要回滚仓库里与你无关的改动

## 代码风格

- 使用 CommonJS 模块
- 除非有明确需求，否则源码默认使用 ASCII
- 保持方法短小清晰
- 只在逻辑不直观时添加简短注释

## 测试

在打开 PR 之前运行测试：

```bash
npm test
```

当你修改引擎行为时，请同步更新或新增 `tests/` 下的测试。

## PR 清单

- 行为变化时同步更新 README 和文档
- 已补充或更新测试
- 示例仍可正常运行
- 公共 API 变更已记录

## 发布说明

如果你在准备 npm 发布，请确认：

- `package.json` 版本和元数据
- GitHub 仓库地址
- npm 包名 `@omgod/tico`
