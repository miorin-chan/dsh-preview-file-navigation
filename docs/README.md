# 项目文档

[使用与安装](../README.zh.md) · [English README](../README.md) · [开发约定](../AGENTS.local.md)

## 实现与兼容性

[客户端入口](../src/client/index.tsx) 通过 `sidebar.footer.action` 注册组件，在侧栏展开时将文件入口渲染到会话列表下方。
工作区文件服务提供目录列表和路径搜索。选择文件后，右侧边栏通过资源地址打开内置预览。
内置文件页和 `workspace.files` 命令仍由 DeepSeek Harness 提供。

本包固定支持 **DeepSeek Harness 0.2.2-rc.5**。
升级时核对侧栏插槽、工作区文件服务和预览路由，再在一次性配置中验证。

## 构建与验证

在新检出的插件目录中执行以下命令。
安装依赖时，`prepare` 会生成运行文件。

```sh
pnpm install --frozen-lockfile
pnpm run check
```

修改源码后，先运行 `pnpm run build` 更新产物，再运行检查。

在一次性 Web 配置中检查入口是否位于会话列表下方并显示当前工作区名称、文件区能否原位平滑展开和收起、
目录是否随当前会话切换，以及预览能否在右侧打开。
同时验证文件搜索、窄侧栏，以及内置文件页和原有快捷键。
