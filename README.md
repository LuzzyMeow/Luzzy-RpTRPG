<div align="center">

<img src="https://z-cdn.chatglm.cn/z-ai/static/logo.svg" alt="Z.AI Logo" width="120" height="120">

# Luzzy-RpTRPG

**基于 RP-Hub 与 AI Sandbox Game 的增强二创项目 · Android APK + 浏览器双端运行**

</div>

---

> ⚠️ **项目状态：测试阶段（Beta）**
>
> 本项目仍处于**早期测试阶段**，可能存在不稳定、功能缺陷或兼容性问题。请将使用中遇到的问题反馈至 [Issues](../../issues)，感谢您的理解与支持。

---

## 🏗️ 二创来源声明

本项目是一个**二次创作（二创）项目**，基于以下两个开源项目构建，遵循原作者的许可协议：

### 1. RP-Hub（核心框架）

| 项目 | 信息 |
|------|------|
| **官方仓库** | [STA1N156/RP-Hub](https://github.com/STA1N156/RP-Hub) |
| **原作者** | [STA1N156](https://github.com/STA1N156) |
| **许可协议** | [CC BY-NC 4.0](./LICENSE)（署名-非商业性使用） |
| **项目定位** | 纯前端运行的本地角色扮演（Roleplay）对话和角色卡生成工具 |
| **Fork 时间** | 2026-06-17 |

### 2. AI Sandbox Game（TRPG 模式来源）

| 项目 | 信息 |
|------|------|
| **官网** | [aisandboxgame.com](https://aisandboxgame.com/) |
| **官方仓库** | [hayowei/aisandboxgame](https://github.com/hayowei/aisandboxgame) |
| **作者** | [hayowei](https://github.com/hayowei) |
| **项目定位** | AI 驱动的沙盒 TRPG 游戏引擎 |

> **感谢原作者 STA1N156 和 hayowei 的开源贡献，本项目才得以存在。**

---

## 🤖 Coding 模型

<div align="center">

<img src="https://z-cdn.chatglm.cn/z-ai/static/logo.svg" alt="Z.AI / GLM Logo" width="64" height="64">

**GLM-5.2** · 由 [智谱清言](https://chatglm.cn/) / [Z.AI](https://z.ai/) 提供的千亿参数大语言模型

</div>

本项目的开发过程（代码编写、架构设计、问题诊断、文档撰写）由 **GLM-5.2** 模型驱动完成。

---

## ✨ 功能概览

### 本 Fork 相对原项目的增强功能

| # | 功能 | 说明 |
|:---:|------|------|
| 1 | 🤖 **Android APK 构建** | Capacitor 8 打包，内置 `CapacitorHttp` 绕过 CORS 限制 |
| 2 | 🌋 **火山方舟 API 兼容** | 支持 `/v3` 版本后缀，`https://ark.cn-beijing.volces.com/api/coding/v3` 可直接使用，无需外部 proxy |
| 3 | ⌨️ **模型名自由输入** | 模型选择弹窗新增手动输入框，可手填任意模型名（如 `ark_deepseek-v4-pro`），同时适用于主模型和嵌入模型 |
| 4 | 🏪 **万相广场自动导入** | 原生层捕获下载请求，角色卡和 UI 模板**直接导入到 app**，无需手动从文件系统选择 |
| 5 | 🎲 **TRPG 模式** | iframe 嵌入 AI Sandbox Game，走 RP-Hub API 配置，内置 NanoHTTPD 本地代理解决 CORS |
| 6 | 🧠 **API 请求体高级设置** | 深度思考开关 + 自定义 JSON 合并，兼容 DeepSeek 和火山方舟，TRPG 模式下同样生效 |
| 7 | 🔌 **MCP HTTP 工具导入** | JSON 导入 MCP 远程工具服务器，AI 通过 `<tool_mcp_*>` 标签调用 |
| 8 | 📚 **SKILL 工具系统** | 三种方式导入 SKILL 提示词包（GitHub / ZIP / 手动新建），AI 通过 `<tool_skill_*>` 标签调用 |
| 9 | 🧠 **记忆召回工具** | 内置记忆召回工具，支持 per-tool 全局记忆开关，自动召回相关记忆注入上下文 |
| 10 | 💾 **全局记忆（MEMORY.md）** | 全局记忆二级选项，支持 MEMORY.md 持久化存储和注入 |
| 11 | 🔍 **向量记忆分片查看** | 向量记忆检索结果分片查看，支持查看每个分片的详细内容 |
| 12 | 📁 **SKILL 文件管理器树形化** | SKILL 文件管理器改为树形结构，支持文件夹展开/折叠 |
| 13 | 🌐 **GitHub 镜像站加速** | SKILL GitHub 导入支持国内镜像站（gh-proxy.com、github.moeyy.xyz、ghfast.top） |
| 14 | 🎭 **Luzzy 内置预设** | 新增 Luzzy 内置预设（NSFW 提示词，注入位置 system），删除旧内置预设 |
| 15 | 🔀 **多供应商架构** | 设置密钥即启用，不再强制切换单一供应商；模型名格式 `<providerId>_<model_name>`；嵌入模型可使用独立供应商 |
| 16 | 🌊 **流式输出** | 原生平台通过 XMLHttpRequest + 本地代理实现真流式输出，浏览器走 fetch + ReadableStream |
| 17 | 🔧 **世界书工具调用修复** | 思考链 `<cot>` 内的工具调用标签可正确执行，思考卡片显示工具调用 |

---

## 📚 SKILL 工具系统

在工具面板新增「+ 添加 SKILL」按钮，支持导入 SKILL 提示词包。

### 三种导入方式

| 方式 | 说明 |
|------|------|
| **GitHub 仓库** | 粘贴 GitHub URL，自动下载仓库内容。支持 `https://github.com/{owner}/{repo}`、`/tree/{branch}`、`/tree/{branch}/{subdir}` 子目录路径 |
| **上传 ZIP** | 上传包含 SKILL.md 的 ZIP 压缩包，识别最外层 SKILL.md 后完整解压所有文件 |
| **手动新建** | 内置文件管理器，手动新建文件夹、子文件夹和 `.md` 文件，默认创建 SKILL.md 模板 |

### SKILL 执行机制

- **提示词注入**：AI 调用 `<tool_skill_<id>_add:任务描述>` 标签 → 系统注入 SKILL.md 内容作为上下文
- **文件阅读**：AI 调用 `<tool_skill_readfile_add:skill_name/file_path>` 读取 SKILL 目录下的配套文件（仅支持文本文件）

### 工具二级分类

工具列表分为三组，分组标题分隔显示：

| 分组 | 类型 | 说明 |
|------|------|------|
| **内置工具** | `vector` / `keyword` / `web` / `world` / `skill_readfile` | 全局启用，不受角色卡过滤 |
| **MCP 工具** | `mcp_http` | 可按角色卡启用，通过 MCP 协议调用远程工具 |
| **SKILL** | `skill` | 可按角色卡启用，注入 SKILL.md 提示词包 |

### 角色卡按需启用

SKILL 和 MCP 工具可设置启用范围：

- **所有角色卡可用**（默认）：任何角色卡都能感知和使用此工具
- **自定义角色卡**：仅选中的角色卡可感知和使用此工具

> 内置工具始终全局启用，不受角色卡过滤影响。

### 作用范围

- ✅ **RP-Hub 主聊天**：SKILL 和 MCP 工具生效
- ❌ **TRPG 模式**：不生效（TRPG iframe 跨 origin 无法注入工具说明 prompt）

---

## 🎲 TRPG 模式（AI 沙盒游戏）

侧边栏新增 TRPG 入口，iframe 嵌入 [AI Sandbox Game](https://aisandboxgame.com/)。

### 核心特性

- **iframe 缓存**：使用 `v-show` 控制，切换到其他功能再切回 TRPG，网页状态保持不变
- **走 RP-Hub API 配置**：自动使用 RP-Hub 主设置的 API 配置发起请求，无需在 TRPG 网页内单独配置真实 API
- **模型名自由设置**：TRPG 网页内的模型商名称、API、APIKey 仅作占位符，真正生效的是模型名
- **内置本地代理**：NanoHTTPD 代理服务器（`localhost:18527`），解决 iframe 内 CORS 限制
- **字节透传**：直接从 `session.getInputStream()` 读取字节并 `setChunkedStreamingMode(0)` 写出，根治 UTF-8 双重编码乱码
- **抗更新**：代理机制在 Android 原生层，不修改网页代码，aisandboxgame.com 更新不影响代理

### 配置步骤

1. 在 RP-Hub 主设置中配置好 API 地址和 API Key
2. 进入 TRPG 模式 → 自动弹出「TRPG 模式说明」弹窗
3. 阅读说明（如不需重复提示，勾选「本次不再提示」）→ 点击「我已了解，开始游戏」
4. 在 TRPG 网页的 API 设置中添加自定义供应商：
   - API 地址填：`http://localhost:18527/v1`
   - API Key 随便填（占位符，实际使用 RP-Hub 的 Key）
   - 模型名自由设置（如 `DeepSeek-V4-Pro`，无需在 RP-Hub 预先配置）
5. 开始 TRPG 游戏体验

---

## 🧠 API 请求体高级设置

在「API 连接与服务」板块内新增「API 请求体高级设置」折叠区，支持深度思考。

| 功能 | 说明 |
|------|------|
| **深度思考快捷开关** | 一键注入 `thinking.type: "enabled"`，兼容 DeepSeek thinking_mode 和火山方舟深度思考 |
| **自定义请求体 JSON** | 最高优先级合并到请求体，实时校验 JSON 有效性。可注入 `reasoning_effort`、`max_completion_tokens` 等字段 |

**合并优先级**：基础字段 < 深度思考开关 < 自定义 JSON

**字段保护**：`model` 和 `messages` 核心字段受保护，自定义 JSON 不可覆盖

**作用域**：高级设置作用于 RP-Hub 主聊天 chat/completions 请求。**TRPG 模式下同样生效**——本地代理服务器会解析请求体并注入高级设置字段。

**自定义 JSON 示例**：
```json
{"reasoning_effort":"medium","max_completion_tokens":8192}
```

---

## 🔀 多供应商架构

支持同时配置多个 API 供应商，设置密钥即算启用，不再强制切换单一供应商。

### 模型名格式

所有模型名采用 `<providerId>_<model_name>` 格式，用下划线分隔供应商 ID 和模型名：
- `ark_deepseek-v4-pro`（ark 供应商的 deepseek-v4-pro 模型）
- `openai_gpt-4o`（openai 供应商的 gpt-4o 模型）

系统根据模型名前缀自动路由到对应供应商的 API URL 和 Key。

### 自定义供应商

- 新增自定义供应商时填写**供应商 ID**（仅英文字母，如 `ark`、`myapi`）
- 供应商 ID 用于模型名前缀，不可修改（编辑模式下禁用）
- 删除供应商时自动清理所有模型名中该供应商的前缀

### 嵌入模型独立供应商

记忆系统的嵌入模型可使用与聊天模型不同的供应商：
- 在「记忆引擎设置」中选择嵌入模型供应商
- 嵌入模型的 API URL 和 Key 从该供应商获取
- 支持场景：嵌入模型用供应商 A，聊天模型用供应商 B

---

## 🌊 流式输出

支持在聊天和 TRPG 模式下流式输出 AI 响应。

### 实现方案

| 平台 | 方案 | 说明 |
|------|------|------|
| **浏览器** | fetch + ReadableStream | 标准 Web API，直接读取流式响应 |
| **Android 原生** | XMLHttpRequest + 本地代理 | 绕过 CapacitorHttp patch，通过 `localhost:18527` 代理实现真流式 |

**技术细节**：CapacitorHttp 会 patch 全局 `fetch`，导致 `response.body.getReader()` 在 Android 上一次性返回完整数据。XMLHttpRequest 不被 patch，其 `onprogress` 事件可逐步接收数据，`responseText` 增量更新，因此可用于真流式输出。

---

## 🔌 MCP HTTP 工具导入

在工具面板新增「+ 添加 MCP 工具」按钮，支持通过 JSON 形式导入 MCP（Model Context Protocol）远程工具服务器。

- **传输协议**：MCP Streamable HTTP transport（2025-03-26 规范，单端点 POST 返回 JSON 或 SSE）
- **支持两种 JSON 格式**：扁平格式（HTTP transport）和 `mcpServers` 嵌套格式（Claude Desktop / Cursor 通用）
- **AI 调用机制**：复用 `<tool_*>` 标签协议，AI 输出 `<tool_mcp_<serverShortId>_<toolName>:argsJSON>` 触发 `tools/call`
- **持久化**：MCP 工具配置随 `activeTools` 数组存入 IndexedDB，启动时不主动拉取 `tools/list`

---

## 🧠 记忆系统增强

### 记忆召回工具

内置「记忆召回」工具，AI 可通过 `<tool_memory_recall_*>` 标签主动召回相关记忆。

- **per-tool 全局记忆开关**：每个记忆召回工具可独立配置是否启用全局记忆
- **自动召回**：AI 调用工具时自动召回相关记忆注入上下文
- **向量检索**：基于 cosineSimilarity 的 topK 向量检索

### 全局记忆（MEMORY.md）

- **持久化存储**：全局记忆内容持久化到 IndexedDB
- **自动注入**：全局记忆内容自动注入到请求上下文
- **二级选项**：支持在记忆设置中开启/关闭全局记忆

### 向量记忆分片查看

- **分片展示**：向量记忆检索结果以分片形式展示
- **详细内容**：支持查看每个分片的详细内容和相似度分数
- **调试友好**：便于调试向量记忆检索效果

---

## 📁 SKILL 文件管理器

### 树形结构

SKILL 文件管理器改为树形结构，支持文件夹展开/折叠：

- **层级展示**：文件夹和文件以树形层级展示
- **展开/折叠**：点击文件夹可展开/折叠子内容
- **文件操作**：支持新建文件夹、子文件夹和 `.md` 文件

### GitHub 镜像站加速

SKILL GitHub 导入支持国内镜像站，自动检测网络环境选择最优镜像：

| 镜像站 | URL |
|--------|-----|
| gh-proxy.com | `https://gh-proxy.com/` |
| github.moeyy.xyz | `https://github.moeyy.xyz/` |
| ghfast.top | `https://ghfast.top/` |

---

## 🎭 预设系统

### Luzzy 内置预设

新增 Luzzy 内置预设（NSFW 提示词），注入位置为 `system`。

- **完整 NSFW 提示词**：包含角色扮演、情境设定、行为规范等完整提示词
- **年龄下限 18**：所有角色均为 18 岁以上成年人
- **默认启用**：作为默认预设自动启用

### 第二/第三人称预设

- **第二人称预设**：使用"你"指代用户，第二人称限制视角叙事（`enabled` 联动 `user.person !== 'third'`）
- **第三人称预设**：使用 {{user}} 称呼用户，第三人称叙事（`enabled` 联动 `user.person === 'third'`）

### 旧预设清理

已删除以下旧内置预设（用户已保存的数据会自动清理）：
- 破限 + 4 个破限预注入
- 色情内容增强、防抢话、防神化、防重复
- 人格内核、文风（抗八股）、禁止规则、COT

---

## 🚀 快速开始

### 方式一：Android APK 使用（推荐）

1. 从 [Releases](../../releases) 下载最新 `RP-Hub-v1.7.1-debug.apk`
2. 在 Android 手机上安装（需允许「安装未知来源应用」）
3. 打开 RP-Hub，在设置中配置 API 地址和 API Key
4. 进入万相广场下载角色卡/UI 模板，会自动导入到 app
5. 开始 Roleplay 或进入 TRPG 模式

### 方式二：浏览器使用（同原项目）

1. 下载或 clone 本仓库
2. 双击打开 `index.html`，在浏览器（推荐 Chrome / Edge）中启动
3. 在设置中填入 API URL、API Key，选择或输入模型名
4. 导入角色卡，开始 Roleplay

---

## 🔧 构建指南

### 环境要求

| 组件 | 版本 |
|------|------|
| Node.js | 18+ |
| JDK | 21（Microsoft OpenJDK 21 测试通过） |
| Android SDK | Command-line Tools + Platform android-36 + Build-Tools 36.0.0 |

### 环境变量

```
JAVA_HOME = <JDK 21 路径>
ANDROID_HOME = <Android SDK 路径>
```

### 构建命令

```bash
# 安装依赖
npm install

# 同步 Web 资源到 Android 工程
npm run sync

# 构建 debug APK
cd android
.\gradlew.bat assembleDebug       # Windows
./gradlew assembleDebug           # Linux/Mac

# APK 输出路径
# android/app/build/outputs/apk/debug/RP-Hub-v1.7.1-debug.apk
```

### 重新构建（修改代码后）

```bash
npm run sync && cd android && .\gradlew.bat assembleDebug
```

> ⚠️ **注意**：`npx cap sync` 不会自动同步 `android-patches/MainActivity.java` 到 `android/` 目录，需手动执行 `Copy-Item`。

---

## 🔄 与原项目的差异

| 特性 | 原项目 (RP-Hub) | 本 Fork (Luzzy-RpTRPG) |
|------|------|------|
| 运行方式 | 浏览器打开 HTML | 浏览器 + Android APK |
| 火山方舟 API | 需外部 proxy | APK 内直接可用 |
| 模型选择 | 仅下拉列表 | 下拉 + 手动输入 + `<providerId>_<model_name>` 格式 |
| 万相广场下载 | 下载到文件系统 | 直接导入到 app |
| TRPG 模式 | 无 | 内置 + 走 RP-Hub 配置 + 本地代理 |
| 深度思考支持 | 无 | 快捷开关 + 自定义 JSON（TRPG 模式同样生效） |
| MCP 工具 | 无 | JSON 导入 + 标签调用 |
| SKILL 工具 | 无 | GitHub / ZIP / 手动新建三种导入 |
| 角色卡工具过滤 | 无 | SKILL 和 MCP 工具按角色卡启用 |
| 流式传输 | 支持 | 浏览器 + Android 原生均支持真流式 |
| 多供应商 | 仅单一供应商 | 多供应商 + 嵌入模型独立供应商 |
| 记忆召回工具 | 无 | 内置记忆召回 + per-tool 全局记忆开关 |
| 全局记忆 | 无 | MEMORY.md 持久化 + 自动注入 |
| 向量记忆分片查看 | 无 | 分片展示 + 详细内容查看 |
| SKILL 文件管理器 | 平铺 | 树形结构 + 展开/折叠 |
| GitHub 镜像站 | 无 | 国内镜像站加速 |
| 内置预设 | 旧预设 | Luzzy 预设 + 第二/第三人称 |
| 世界书工具调用 | 仅主内容扫描 | 主内容 + 思考链 `<cot>` 内扫描 |

---

## ⚠️ 已知限制

- 万相广场未审核/管理员卡片使用 blob URL 下载，可能无法自动导入
- TRPG 模式说明弹窗首次进入会弹出，可勾选「本次不再提示」（App 重启后恢复）
- MCP 和 SKILL 工具仅对 RP-Hub 主聊天生效，TRPG 模式不生效
- 当前仅提供 debug APK，release 版需配置签名密钥

---

## 📁 目录结构

```text
Luzzy-RpTRPG/
├── index.html                # 主程序
├── character/                # 角色工坊辅助页面
│   └── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js            # 核心业务逻辑（含本 Fork 改动）
│       ├── card-utils.js     # 角色卡工具
│       ├── ui-select.js      # 自定义选择器
│       └── utils.js          # 工具函数
├── capacitor.config.json     # Capacitor 配置（本 Fork 新增）
├── package.json              # 构建脚本（本 Fork 新增）
├── scripts/
│   └── copy-web-to-www.js    # Web 资源复制脚本（本 Fork 新增）
├── android/                  # Capacitor Android 工程（构建时生成）
├── www/                      # Web 资源副本（构建时生成）
├── CHANGELOG.md              # 详细改动日志（本 Fork 新增）
└── README.md                 # 本文件
```

---

## 🔄 从上游同步更新

当原项目 [STA1N156/RP-Hub](https://github.com/STA1N156/RP-Hub) 有更新时：

```bash
# 添加上游远程
git remote add upstream https://github.com/STA1N156/RP-Hub.git

# 拉取并合并
git fetch upstream
git merge upstream/main

# 处理冲突后，重新构建
npm run sync
cd android && .\gradlew.bat assembleDebug
```

合并冲突通常出现在 `assets/js/app.js` 和 `index.html`，详见 [CHANGELOG.md](./CHANGELOG.md)。

---

## 📜 协议与许可

本项目继承原项目的 **[CC BY-NC 4.0](./LICENSE)** 协议：

- **署名**：必须保留原作者 STA1N156 的署名
- **非商业性使用**：禁止任何形式的商业化使用
- 详细条款见 [LICENSE](./LICENSE) 文件

---

## 🙏 致谢

| 贡献者 | 说明 |
|------|------|
| **[STA1N156](https://github.com/STA1N156)** | 开源 RP-Hub 项目 —— 本 Fork 的核心框架来源 |
| **[hayowei](https://github.com/hayowei)** | 开源 AI Sandbox Game —— TRPG 模式来源 |
| **[智谱清言 / Z.AI](https://z.ai/)** | GLM-5.2 大语言模型 —— 本项目的 Coding 模型 |
| **[Model Context Protocol](https://modelcontextprotocol.io/)** | MCP 工具调用规范 |

**技术栈**：Vue 3 · Tailwind CSS · Capacitor 8 · NanoHTTPD · JSZip · Microsoft OpenJDK 21
