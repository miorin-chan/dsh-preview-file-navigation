# 工作区文件

[English](README.md)

在左侧边栏浏览当前会话的工作目录，并查看本轮次中 Agent 读取或修改的文件。
选择文件后，右侧边栏会打开内置预览。

## 实拍截图

![工作区文件搜索列出与 release 匹配的路径](docs/assets/screenshots/main-light.png)

- 工作区文件入口 · [浅色](docs/assets/screenshots/entry-light.png) · [深色](docs/assets/screenshots/entry-dark.png)
- 文件搜索结果 · [浅色](docs/assets/screenshots/main-light.png) · [深色](docs/assets/screenshots/main-dark.png)

## 安装

此本地插件包仅支持 **DeepSeek Harness 0.2.2-rc.5** 的 Web 客户端。
在新检出的目录中运行 `pnpm install --frozen-lockfile` 安装依赖并构建插件。
然后在 **插件** → **添加插件** 中选择该目录，并在安装期间保留其位置。
[Workspace Atlas](../dsh-atlas-workspace/README.zh.md) 已包含「工作区文件」，选择一种方式安装即可。

## 使用

1. 打开一个有工作目录的会话。
   会话列表下方的工作区默认展开为「本轮文件」视图，以裁剪后的目录树展示当前轮次读取或修改过的文件，
   并在行尾以色点区分读与写（折叠目录也会冒泡显示更小的提示点）。
2. 点击工作区名称或三角按钮，按 **本轮文件 → 全部文件 → 收起** 三态循环切换。
3. 点击工作区标题右侧的放大镜，打开 **搜索文件名或路径**。
   选择文件即可打开内置预览，选择搜索结果中的目录可在树中定位它。
4. 按 Esc 或点击搜索框内的关闭按钮可恢复先前的目录视图。

[开发与兼容性说明](docs/README.md)
