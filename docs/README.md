# 项目文档

[使用与安装](../README.zh.md) · [English README](../README.md) · [开发约定](../AGENTS.local.md)

## 实现与兼容性

[客户端入口](../src/client/index.tsx) 在 `sidebar.footer.action` 注册左侧边栏入口，
通过工作区文件服务列出目录和搜索路径。
选择文件后，右侧边栏通过资源地址打开内置预览。
内置文件页和 `workspace.files` 命令仍由 DeepSeek Harness 提供。

本包固定支持 **DeepSeek Harness 0.2.2-rc.5**。
升级时核对侧栏插槽、工作区文件服务和预览路由，再在一次性配置中验证。

## 构建与验证

在插件目录执行以下命令。

```sh
pnpm install --ignore-scripts
pnpm run build
pnpm run check
```

在一次性 Web 配置中检查入口是否位于设置上方、文件区能否原位展开和收起、目录是否随当前会话切换，以及预览能否在右侧打开。
同时验证文件搜索、窄侧栏，以及内置文件页和原有快捷键。
