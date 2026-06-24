<div align="center">

<img src="docs/brand-logos/luzzy.png" width="80" height="80" alt="LUZZY" />&nbsp;&nbsp;&nbsp;
<img src="docs/brand-logos/deepseek.png" width="80" height="80" alt="DeepSeek" />&nbsp;&nbsp;&nbsp;
<img src="docs/brand-logos/zai.png" width="80" height="80" alt="Z.ai · 智谱清言" />&nbsp;&nbsp;&nbsp;
<img src="docs/brand-logos/trae.png" width="80" height="80" alt="Trae IDE & Trae Work" />

# LUZZY · 鹿溪

> **每次对话，都像一本有你的小说。**

*Every conversation feels like a novel with you in it.*

[![Version](https://img.shields.io/badge/version-v0.8.2-9d4edd?style=flat-square)](./CHANGELOG.md)
[![License](https://img.shields.io/badge/license-CC%20BY--NC%204.0-ffb703?style=flat-square)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20Web-219ebc?style=flat-square)](#)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react&logoColor=white)](https://react.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8-119eff?style=flat-square&logo=capacitor&logoColor=white)](https://capacitorjs.com/)

[📦 下载 APK](https://github.com/LuzzyMeow/Luzzy-RpTRPG/releases/latest) · [📜 更新日志](./CHANGELOG.md) · [🐛 提交问题](https://github.com/LuzzyMeow/Luzzy-RpTRPG/issues)

</div>

---

## ✨ 关于 LUZZY · About

**LUZZY** 是一款面向 **AI 角色扮演（AI Roleplay）** 与 **TRPG 桌面角色扮演** 的移动端对话应用，专注 Android 原生体验，同时支持浏览器运行。围绕移动端交互、角色卡生态、长期记忆机制与 Agentic 工具系统进行了深度定制。

> **LUZZY** is a mobile-first conversation app for **AI roleplay** and **TRPG tabletop role-playing**, optimized for Android and also runnable in browsers. Deeply customized for mobile interaction, character cards, long-term memory, and Agentic tool systems.

---

## 🌟 核心亮点 · Highlights

<div align="center">

| 💬 沉浸式聊天 | 🎭 角色卡生态 | 🧠 长期记忆 | 🛠️ 工具系统 |
|:---:|:---:|:---:|:---:|
| CoT 思考链可视化<br>液态玻璃拟态沉浸背景<br>流式输出 · 翻译 · 重试分支 | SillyTavern PNG 导入/导出<br>世界书 · 正则脚本 · 收藏<br>滑动操作 · 头像预览 | ACE 三步循环记忆<br>向量相似度检索<br>嵌入去重与评分淘汰 | Agentic 多步工具调用<br>MCP / SKILL 扩展<br>内置记忆/搜索工具 |

</div>

### 14 个完整功能页面 · 14 Fully-Featured Pages

聊天 `Chat` · 角色卡 `Characters` · TRPG 模式 `TRPG` · 工具 `Tools` · 记忆 `Memory` · 预设 `Preset` · 世界书 `World Info` · 知识库 `Knowledge Base` · 正则脚本 `Regex` · UI 模板 `UI Template` · 用户档案 `Profile` · 设置 `Settings` · 技能 `Skill` · 关于 `About`

---

## 🎲 TRPG 模式 · TRPG Mode

v0.8.0 引入完整的 D&D 5e 风格 TRPG 引擎，AI 主持人驱动叙事，玩家通过行动选项卡片交互。

> v0.8.0 introduces a full D&D 5e-style TRPG engine with an AI Game Master driving the narrative and players interacting via action option cards.

| 特性 | 说明 |
|------|------|
| **Think-1/2/OOC 三段推理** | 从 `reasoning_content` 解析思考链、OOC 审查 JSON，合并 TS 端规则检查 |
| **OOC 审查 7 项** | 元游戏/知识越界/角色扮演（LLM 审查）+ 力竭/物品/安全（TS 审查）+ 内容分级（自动） |
| **A/B/C 三级摘要** | A 级每轮生成（上限 50）/ B 级每 10 轮（上限 10）/ C 级每 50 轮（永久） |
| **Think-4 行为评分** | 公平性 0.35 + 一致性 0.25 + 后果 0.25 + 连贯性 0.15 |
| **D&D 5e 规则** | 战斗（攻击/施法/道具/协助/准备/闪避/冲刺/脱战）/ 社交（态度 DC + ±2 漂移）/ 休息（生命骰 + 法术位 + 力竭）/ 升级（职业骰 + ASI） |
| **角色面板** | 自己/NPC 双标签 · NPC 态度徽章 · `revealedFields` 渐进式解锁 |
| **战斗状态条** | 轮次/先攻/HP/AC/参战者实时展示 |

---

## 🤖 Agentic 工具系统 · Agentic Tool System

v0.8.1 引入 Agentic 多步工具调用循环，模型在单次对话中可连续调用多个工具并自动处理结果。

> v0.8.1 introduces an Agentic multi-step tool call loop where the model can consecutively call multiple tools within a single conversation turn.

- **多步循环**：最多 10 步（可配 1-20），模型自主决定何时信息充分并输出正文
- **`tool_choice: 'required'`**：首次请求强制工具调用，API 不支持时自动回退 `'auto'`
- **被动工具过滤**：`memory-recall` / `world-recall` 由系统预执行，不注入 `tools` 参数
- **循环检测**：`Set<string>` 记录 `toolName|queryNormalized`，重复调用自动终止
- **链式检索**：支持 `world-recall → vector-memory → keyword-search` 多步链式调用

---

## 🏗️ 技术架构 · Tech Stack

### 前端 Frontend

| 类别 | 技术 |
|------|------|
| **Framework** | React 19.2.4 + TypeScript 5.9.2 + React Router 7.13.0（SPA） |
| **Styling** | Tailwind CSS v4 + `tw-animate-css`（oklch 色彩空间）+ 液态玻璃设计 |
| **UI Kit** | shadcn/ui（New York）+ Radix UI |
| **State** | Zustand 5.0.11（9-slice 架构） |
| **Animation** | motion v12（Framer Motion）+ motion-presets |
| **I18n** | i18next + react-i18next（中文 / English） |
| **Build** | Vite 7.1.7 + pnpm + vite-plugin-svgr |

### 服务层 Services

15 个核心服务覆盖完整业务：`apiClient` · `chatService` · `storage` · `providerService` · `memoryService` · `toolService` · `presetContent` · `mcpService` · `markdownService` · `worldInfoService` · `knowledgeBaseService` · `sessionService` · `logger` · `aceSkillbookService` · `aceReflectorService` · `aceSkillManagerService`

- **本地持久化**：IndexedDB（`RPHubDB` v2，13 个 object store）
- **流式请求**：双通道架构 — XHR 原生代理（Android）+ fetch ReadableStream（浏览器）
- **缓存层**：通用响应缓存 30 min / Embedding 缓存 60 min
- **ACE 记忆**：Execute → Reflect → Update 三步循环，Skillbook JSON 持久化

### Android 原生 Android

- **Capacitor 8** 原生封装
- **NanoHTTPD** 本地代理（`localhost:18527`）解决 WebView CORS 与 POST body 拦截限制
- **最低/目标 SDK**：由 `variables.gradle` 统一管理

---

## 🚀 快速开始 · Quick Start

### 环境要求 · Requirements

- Node.js 18+
- pnpm 9+
- Android Studio（Android SDK）
- Microsoft Visual C++ Redistributable（Windows AAPT2 依赖）

### 前端开发 · Frontend Dev

```bash
cd frontend
pnpm install
pnpm run typecheck   # 类型检查
pnpm run lint        # 代码检查
pnpm run dev         # 本地开发
pnpm run build       # 生产构建（自动同步到 android/assets）
```

### Android APK 构建 · Build APK

```powershell
# 前端构建会自动同步产物到 android/app/src/main/assets/public/
# 确认 assets 已更新后直接编译：
cd android
.\gradlew.bat assembleDebug
```

📦 **输出路径**：`android/app/build/outputs/apk/debug/LUZZY-v{version}-debug.apk`

---

## 📂 项目结构 · Project Structure

```text
RP-Hub/
├── frontend/              # 前端源码
│   ├── app/
│   │   ├── components/    # UI 组件（luzzy / markdown / message / ui / workbench）
│   │   ├── routes/        # 14 个路由页面
│   │   ├── services/      # 业务服务层（15 个核心服务）
│   │   ├── stores/        # Zustand store（9 slice）
│   │   ├── locales/       # 国际化（zh-CN / en-US）
│   │   └── app.css        # 全局样式 + 字体 + 明暗主题
│   └── public/fonts/      # Alibaba 字体
├── android/               # Android 原生工程
├── android-patches/       # Android 补丁文件
├── docs/                  # 文档与品牌资源
│   └── brand-logos/       # 合作品牌 logo
├── scripts/               # 构建脚本
├── CHANGELOG.md
└── README.md
```

---

## 📰 最新动态 · What's New

### v0.8.2

移除从上游继承但从未启用的配色预设系统（claude / t3-chat / mono / bubblegum / custom），净减少 753 行代码。精简 `ThemeProvider` 227→92 行、`app.css` 766→274 行，删除 `CustomThemeDialog` 组件。修复 Sheet 关闭按钮刘海屏安全区适配。

> Removed the color preset system inherited from upstream but never enabled (claude / t3-chat / mono / bubblegum / custom), net reduction of 753 lines. Trimmed `ThemeProvider` 227→92 lines, `app.css` 766→274 lines, deleted `CustomThemeDialog` component. Fixed Sheet close button safe-area inset for notch screens.

### v0.8.1

Agentic 多步工具调用循环：单次回复中模型可进行最多 10 步（可配 1-20）工具调用循环。首次 API 请求使用 `tool_choice: 'required'` 强制工具调用，API 不支持时自动回退 `'auto'`。被动工具从 `tools` 参数过滤。`Set<string>` 循环检测防止重复调用。默认工具模式从 force 改为 active。

> Agentic multi-step tool call loop: within a single reply the model can perform up to 10 (configurable 1-20) tool call rounds. First API request uses `tool_choice: 'required'`, auto-falling back to `'auto'` when unsupported. Passive tools filtered from `tools` parameter. `Set<string>` loop detection prevents duplicate calls. Default tool mode changed from force to active.

### v0.8.0

TRPG 模式：D&D 5e 风格规则引擎，Think-1/2/OOC 三段推理，A/B/C 三级记忆摘要，Think-4 行为评分，战斗/社交/休息/升级完整规则，NPC 渐进式解锁，战斗状态条。

> TRPG mode: D&D 5e-style rules engine, Think-1/2/OOC three-stage reasoning, A/B/C three-level memory summaries, Think-4 action scoring, full combat/social/rest/leveling rules, NPC progressive unlock, combat status bar.

### v0.7.2

两阶段→单阶段架构重构：合并工具决策与 CoT/正文为单次 API 调用。世界书召回重构为三策略混合召回（constant 直注 + 关键词触发 + 语义相似度）。

> Two-stage → single-stage architecture refactor: merges tool decision + CoT/main content into a single API call. World info recall refactored into three-strategy hybrid recall (constant injection + keyword trigger + semantic similarity).

[查看完整更新日志 · See full changelog →](./CHANGELOG.md)

---

## 🙏 鸣谢 · Acknowledgements

<div align="center">

| 品牌 | 说明 |
|:---:|------|
| [**DeepSeek**](https://deepseek.com) | 深度求索 — LLM 供应商，深度思考（reasoning）能力支持 |
| [**Z.ai · 智谱清言**](https://z.ai) | 智谱 AI — GLM 系列大模型，本项目的核心驱动力 |
| [**Trae IDE**](https://www.trae.ai/) | 字节跳动 AI IDE — 本项目的主力开发工具 |
| [**Trae Work**](https://www.trae.ai/) | 字节跳动 AI 工作助手 — 项目协作与文档生成 |

</div>

---

## 🤝 参与贡献 · Contributing

欢迎通过 [Issues](https://github.com/LuzzyMeow/Luzzy-RpTRPG/issues) 提交 Bug 反馈或功能建议。

> Bug reports and feature suggestions are welcome via [Issues](https://github.com/LuzzyMeow/Luzzy-RpTRPG/issues).

---

## 📄 许可证 · License

本项目采用 [CC BY-NC 4.0](./LICENSE) 许可协议。

> This project is licensed under [CC BY-NC 4.0](./LICENSE).

---

<div align="center">

**Made with 💜 by LuzzyMeow**

</div>
