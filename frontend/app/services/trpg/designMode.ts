/**
 * 设计模式 Stage 0-3 串行对话引导
 * v0.8.0: LLM 引导用户逐步构建世界卡
 *
 * 四阶段流程：
 * - Stage 0：欢迎与方向选择（PERSONA/WORLD/SCENE/IMPROV）
 * - Stage 1：五维框架采集（基调/核心设定/时间锚点/面板字段）
 * - Stage 2：骨架生成与精修（地理/Prompt模块/面板/开场白/角色/时间线/扩展块）
 * - Stage 3：审查与交付（17项自动检查 + 保存）
 */

import type { WorldCard } from '~/types/trpg';

// ============================================================================
// 设计模式阶段定义
// ============================================================================

export type DesignStage = 0 | 1 | 2 | 3;

/** Stage 0 方向选择枚举 */
export type Stage0Direction = 'PERSONA' | 'WORLD' | 'SCENE' | 'IMPROV';

/** Stage 1 五维框架 */
export interface Stage1Framework {
  context_world: string;      // 基调与类型
  context_rules: string;      // 核心设定
  context_chars: string;      // 角色阵营
  context_timeline: string;   // 时间线锚点
  style_guide: string;        // 叙事风格
}

/** 设计模式状态 */
export interface DesignModeState {
  currentStage: DesignStage;
  stage0Direction: Stage0Direction | string | null;
  stage1Framework: Stage1Framework | null;
  stage2Completed: boolean;
  stage3Reviewed: boolean;
  worldCardDraft: Partial<WorldCard>;
}

/** 初始设计模式状态 */
export function createInitialDesignModeState(): DesignModeState {
  return {
    currentStage: 0,
    stage0Direction: null,
    stage1Framework: null,
    stage2Completed: false,
    stage3Reviewed: false,
    worldCardDraft: {},
  };
}

// ============================================================================
// Prompt 构建
// ============================================================================

/**
 * 构建设计模式 Prompt
 * @param stage 当前阶段
 * @param state 设计模式状态
 * @param userInput 用户输入
 * @returns 系统提示词
 */
export function buildDesignModePrompt(
  stage: DesignStage,
  state: DesignModeState,
  userInput?: string,
): string {
  switch (stage) {
    case 0:
      return buildStage0Prompt();
    case 1:
      return buildStage1Prompt(state);
    case 2:
      return buildStage2Prompt(state);
    case 3:
      return buildStage3Prompt(state);
    default:
      return '';
  }
}

/** Stage 0 Prompt：欢迎与方向选择 */
function buildStage0Prompt(): string {
  return `你是世界卡设计助手。现在进入 Stage 0：欢迎与方向选择。

请展示欢迎语和四个起始方向：
"欢迎来到设计模式，你想从哪个角度出发？在这里，你可以设计一张属于自己的世界卡。我会一步步引导你——先确立一个大方向，再围绕它逐层展开。"

四个方向：
01 扮演一个角色（PERSONA）— 例如修仙弟子、高考刚结束的少年、末日里的一只猫
02 构建一个世界（WORLD）— 例如修仙宇宙、雨夜的赛博朋克、停战翌日的边境小镇
03 我有一个画面（SCENE）— 直接写出脑中画面即可
04 随便来一个（IMPROV）— 暂无头绪时由引擎起头

用户也可跳过选择，直接写一段描述。请以友好、引导性的语气回复，等待用户选择或输入。`;
}

/** Stage 1 Prompt：五维框架采集 */
function buildStage1Prompt(state: DesignModeState): string {
  const direction = state.stage0Direction;
  const directionText = typeof direction === 'string'
    ? (['PERSONA', 'WORLD', 'SCENE', 'IMPROV'].includes(direction)
      ? `用户选择了方向：${direction}`
      : `用户输入了：${direction}`)
    : '用户未选择方向';

  return `你是世界卡设计助手。现在进入 Stage 1：五维框架采集。

${directionText}

请按以下顺序逐个提问（每次只问一个问题，提供 3-4 个选项 + 「✱ 你来决定」选项）：

1. 基调与类型？（轻松日常/冒险探索/暗流政治/末世生存/你来决定）
2. 核心设定？（用户自由描述世界核心）
3. 时间锚点？（世界卡的此刻定在哪个瞬间？梦醒时分/进行时/双世界交替/你来决定）
4. 面板字段-状态栏？（状态栏想额外追踪什么？）
5. 面板字段-NPC？（NPC 档案想加哪些追踪字段？）

交互规则：
- 每次只问一个问题
- 用户选择「你来决定」时，由你根据已有上下文自主决策
- 用户可随时直接输入自由文本，覆盖选项
- 在每次用户回答后，先复述理解，再问下一个问题

请从第1个问题开始。`;
}

/** Stage 2 Prompt：骨架生成与精修 */
function buildStage2Prompt(state: DesignModeState): string {
  const framework = state.stage1Framework;
  const frameworkText = framework
    ? `五维框架：
- 基调与类型：${framework.context_world}
- 核心设定：${framework.context_rules}
- 角色阵营：${framework.context_chars}
- 时间线锚点：${framework.context_timeline}
- 叙事风格：${framework.style_guide}`
    : '五维框架未完成';

  return `你是世界卡设计助手。现在进入 Stage 2：骨架生成与精修。

${frameworkText}

请按以下顺序批量生成世界卡的各个设定模块：

1. 地理实体（≥3 个，每个含 6 章节 + ≥3 sites）
2. Prompt 模块（4 个必需模块 + module_meta）
3. 面板字段（panel_status + panel_npc）
4. 开场白（150-280 字，in-medias-res）
5. 角色数据库（3-15 个角色）
6. 世界时间线（≥10 事件，严格按时间升序）
7. v2.1 扩展块（laws / mods / artifacts / backgrounds）

每生成一个模块，将结果写入 WorldCard 对应字段。全部生成完毕后将骨架快照写入 stages[2]。

请从第1步地理实体开始生成。`;
}

/** Stage 3 Prompt：审查与交付 */
function buildStage3Prompt(state: DesignModeState): string {
  return `你是世界卡设计助手。现在进入 Stage 3：审查与交付。

请对 Stage 2 生成的世界卡运行 17 项自动检查，输出通过/警告/错误的检查报告：

1. B6: world_setting 缺少 _summary（warning）
2. C6: modules.init 缺少推荐开场标准行（warning）
3. D-dialogue: 角色 sms 示例不足 4 条（warning）
4. D11: 实体/势力无对应角色（warning）
5. D-rels-bidir: 单向关系未补全反向（warning）
6. E6: 事件时间顺序异常（warning）

用户审批后，调用 saveWorldCard 将完整 WorldCard 写入 IndexedDB。`;
}

// ============================================================================
// 响应解析
// ============================================================================

/**
 * 解析设计模式响应
 * @param stage 当前阶段
 * @param content LLM 响应内容
 * @param state 设计模式状态
 * @returns 解析结果（阶段完成状态 + 提取的数据）
 */
export function parseDesignModeResponse(
  stage: DesignStage,
  content: string,
  state: DesignModeState,
): {
  stageCompleted: boolean;
  extractedData?: unknown;
  nextStage?: DesignStage;
} {
  switch (stage) {
    case 0:
      return parseStage0Response(content);
    case 1:
      return parseStage1Response(content, state);
    case 2:
      return parseStage2Response(content, state);
    case 3:
      return parseStage3Response(content, state);
    default:
      return { stageCompleted: false };
  }
}

/** 解析 Stage 0 响应 */
function parseStage0Response(content: string): {
  stageCompleted: boolean;
  extractedData?: Stage0Direction | string;
  nextStage?: DesignStage;
} {
  // 检测用户选择的方向
  const directionMatch = content.match(/\b(PERSONA|WORLD|SCENE|IMPROV)\b/);
  if (directionMatch) {
    return {
      stageCompleted: true,
      extractedData: directionMatch[1] as Stage0Direction,
      nextStage: 1,
    };
  }

  // 如果用户输入了自由文本（非空且非选项），也视为完成
  if (content.trim().length > 10 && !content.includes('欢迎来到设计模式')) {
    return {
      stageCompleted: true,
      extractedData: content.trim(),
      nextStage: 1,
    };
  }

  return { stageCompleted: false };
}

/** 解析 Stage 1 响应 */
function parseStage1Response(
  _content: string,
  _state: DesignModeState,
): {
  stageCompleted: boolean;
  extractedData?: Stage1Framework;
  nextStage?: DesignStage;
} {
  // Stage 1 需要采集5个维度，这里简化处理
  // 实际实现需要根据对话轮次判断是否完成
  return { stageCompleted: false };
}

/** 解析 Stage 2 响应 */
function parseStage2Response(
  _content: string,
  _state: DesignModeState,
): {
  stageCompleted: boolean;
  nextStage?: DesignStage;
} {
  // Stage 2 需要生成7个模块，这里简化处理
  return { stageCompleted: false };
}

/** 解析 Stage 3 响应 */
function parseStage3Response(
  _content: string,
  _state: DesignModeState,
): {
  stageCompleted: boolean;
  nextStage?: DesignStage;
} {
  // Stage 3 是审查阶段，完成后保存世界卡
  return { stageCompleted: false };
}

// ============================================================================
// 设计模式专属底部功能栏按钮
// ============================================================================

/** 设计模式底部功能栏按钮定义 */
export const DESIGN_MODE_TOOLBAR_BUTTONS = [
  { id: 'export', label: '导出世界卡', icon: 'export' },
  { id: 'review', label: '体检审查', icon: 'review' },
  { id: 'preview', label: '应用预览', icon: 'preview' },
] as const;
