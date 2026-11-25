# 项目文档

[使用与安装](../README.zh.md) · [English README](../README.md) · [开发约定](../AGENTS.local.md)

## 实现与兼容性

[宿主入口](../src/host/index.ts) 通过 `sessionProjections` 注册了 `dshPreviewFileNavigation.turnFiles`
会话投影单元（`summary: false`），纯同步折叠 `turn/start`、`tool/call` 与成功的 `tool/result` 事件，
记录当前轮次内 `read`、`read_image`、`write`、`edit`、`apply_patch` 与 `str_replace_editor` 触及的工作区相对路径。
[客户端入口](../src/client/index.tsx) 通过 `sidebar.footer.action` 注册组件，
在侧栏展开时将文件入口渲染到会话列表下方，并直接从标准会话列表快照的 `projectionsBySession` 订阅当前轮次文件表。
工作区文件服务提供目录列表和路径搜索。选择文件后，右侧边栏通过资源地址打开内置预览。
内置文件页和 `workspace.files` 命令仍由 DeepSeek Harness 提供。

本包固定支持 **DeepSeek Harness 0.2.2-rc.5**。
升级时核对侧栏插槽、会话投影协议、工作区文件服务和预览路由，再在一次性配置中验证。

## 界面设计

左侧文件区刻意比原生行更紧凑。文件区与会话列表共用左侧栏的高度，并在区内滚动，所以每行约 26 px（13 px 字号、
1.4 倍行高、上下各 4 px），低于会话行的 32 px 和右侧文件导航约 30 px 的行高。
目录每级缩进随文件区宽度从 180 px 时的 10 px 线性增至 260 px 时的 13 px，总缩进以文件区宽度的 30% 为上限。

缩进引导线沿
用[预览侧栏文件导航补丁](../../../tasks/2026-11-22-preview-file-navigation/out/preview-file-navigation.patch)中紧
凑目录树的样式：0.5 px 的 `--dsw-alias-border-l3` 竖线穿过祖先目录图标的中心。
目录树按平铺行渲染，所以每行为全部祖先层级各画一段线，相邻行的线段连成贯穿整个子树的竖线。
加载、空目录和出错提示比文件行少缩进 10 px，因此不画所属目录那一级的线，只延续更上层的线。
总缩进达到上限后，更深层级的线被截去，不会压到图标上。

标题显示工作区名称、本轮触及文件计数与三态三角箭头，沿用「常驻会话」和「后台任务」的分区标题样式。
标题按钮按「本轮文件（默认，空心向下箭头，按内容高度自适应至最多 50%）→ 全部文件（实心向下箭头，
与会话列表平分高度）→ 收起（实心向右箭头）」三态循环，搜索按钮独立在右侧并在关闭搜索后恢复先前的视图。
文件行尾以 6 px 色点标注当前轮次活动（读取用 `--dsw-alias-state-business-primary`，
修改或读写兼用 `--dsw-alias-state-warn-primary`），折叠目录则以 4 px 冒泡点提示子树内的文件活动，
并在悬停提示中说明具体读写状态。
当前轮次尚无文件读写时，「本轮文件」视图沿用会话列表空状态的居中「图标在上、
文字在下」排版（24 px `--dsw-alias-label-caption` 轮廓文件夹图标配 13 px/20 px `--dsw-alias-label-tertiary` 提示文案）。
中文界面下，名称里的拉丁、希腊和西里尔字母把 x 高度规范为 0.56 em，并使用 500 字重，使尺寸和灰度都与汉字标签持平。
规则与校准见[跨文字标题平衡](../../../tools/new-dsh-plugin/README.md#跨文字标题平衡)，
分段函数复制自工作区 `tools/script-runs/`。

## 构建与验证

在新检出的插件目录中执行以下命令。
安装依赖时，`prepare` 会生成运行文件。

```sh
pnpm install --frozen-lockfile
pnpm run check
```

修改源码后，先运行 `pnpm run build` 更新产物，再运行检查。

在一次性 Web 配置中检查入口是否位于会话列表下方并显示当前工作区名称、三态切换与平滑高度过渡、
当前轮次读写标记与目录冒泡、目录是否随当前会话切换，以及预览能否在右侧打开。
同时验证文件搜索、窄侧栏，以及内置文件页和原有快捷键。
