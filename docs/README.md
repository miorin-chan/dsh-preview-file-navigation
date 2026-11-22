# 项目文档

[使用与安装](../README.zh.md) · [English README](../README.md) · [开发约定](../AGENTS.local.md)

## 上游与兼容性

本包是 DeepSeek Harness 内置 `@deepseek-ai/dsh-client-ui-sidebar-files` 的本地分发，固定使用上游提交
[`eb19c634` 的实现](https://github.com/deepseek-ai/deepseek-harness/tree/eb19c634/packages/client/ui-sidebar-files)，
兼容 **DeepSeek Harness 0.2.2-rc.5**。
上游实现沿用 [MIT 许可证](../LICENSE)。

[Loader 补丁](../cordis.patch.yml) 停用当前配置中的原版文件插件，由本包接管原有的文件标签页和组件 Factory 注册。
文件标签页继续使用原注册 ID；原版文档预览继续使用这些 Factory 打开和切换文件。
分发包使用自己的插件和样式表归属。

## 更新与验证

运行 [构建脚本](../scripts/build.mjs) 时传入已构建的上游检出目录的绝对路径。
脚本使用固定提交的构建产物，调整分发包的插件标识和样式表归属，同时保留原文件标签页 ID。
变更上游版本时，先核对 Loader 条目、Factory 声明和样式归属，再运行上游文件插件测试和本包的测试。
在一次性配置中验证启用时原版注册由本包接管，停用后原版文件插件恢复，并检查文件页、停靠与浮动预览、目录树、
搜索、窄布局和文件打开行为。
