/**
 * TRPG 两阶段 agentic 工具调用闭环
 *
 * 阶段 1：发送 tools，让模型只输出 reasoning + tool_calls
 * 阶段 2：将 tool_calls 与执行结果回传，让模型生成最终回复
 */

import { sendStreamRequest, buildApiRequestBody, parseSSEChunk } from "~/services/apiClient";
import { logger } from "~/services/logger";

export interface ToolCallSpec {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: string;
  result: string;
}

export interface AgenticLoopCallbacks {
  onFirstReasoningDelta?: (delta: string) => void;
  onFirstContentDelta?: (delta: string) => void;
  onFinalReasoningDelta?: (delta: string) => void;
  onFinalContentDelta?: (delta: string) => void;
}

export interface AgenticLoopResult {
  firstReasoningContent: string;
  firstContent: string;
  finalReasoningContent: string;
  finalContent: string;
  toolCalls: ToolCallResult[];
}

export type ApiMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string; name?: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCallSpec[] }
  | { role: "tool"; content: string; tool_call_id: string };

interface StreamAccumulateResult {
  content: string;
  reasoningContent: string;
  toolCalls: ToolCallSpec[];
}

function replaceSystemPrompt(messages: ApiMessage[], appendText: string): ApiMessage[] {
  return messages.map((m) =>
    m.role === "system" ? { ...m, content: `${m.content}\n\n${appendText}` } : m,
  );
}

async function streamAndAccumulate(params: {
  url: string;
  apiKey: string;
  body: Record<string, unknown>;
  onReasoningDelta?: (delta: string) => void;
  onContentDelta?: (delta: string) => void;
}): Promise<StreamAccumulateResult> {
  let content = "";
  let reasoningContent = "";
  const accumulatedToolCalls: ToolCallSpec[] = [];

  await sendStreamRequest({
    url: params.url,
    apiKey: params.apiKey,
    body: params.body,
    signal: undefined,
    onChunk: (_dataStr, parsed) => {
      const chunk = parseSSEChunk(parsed);

      if (chunk.reasoningContent) {
        reasoningContent += chunk.reasoningContent;
        params.onReasoningDelta?.(chunk.reasoningContent);
      }

      if (chunk.content) {
        content += chunk.content;
        params.onContentDelta?.(chunk.content);
      }

      if (chunk.toolCalls && chunk.toolCalls.length > 0) {
        for (const tc of chunk.toolCalls) {
          const existing = accumulatedToolCalls.find((t) => t.id === tc.id && tc.id);
          if (existing) {
            existing.function.name += tc.function?.name ?? "";
            existing.function.arguments += tc.function?.arguments ?? "";
          } else {
            accumulatedToolCalls.push({
              id: tc.id ?? "",
              function: {
                name: tc.function?.name ?? "",
                arguments: tc.function?.arguments ?? "",
              },
            });
          }
        }
      }
    },
  });

  return { content, reasoningContent, toolCalls: accumulatedToolCalls };
}

async function executeToolCalls(
  toolCalls: ToolCallSpec[],
  executor: (name: string, args: Record<string, unknown>) => string,
): Promise<ToolCallResult[]> {
  const results: ToolCallResult[] = [];

  for (const tc of toolCalls) {
    let result: string;
    try {
      const args = JSON.parse(tc.function.arguments);
      result = executor(tc.function.name, args);
    } catch (e) {
      result = JSON.stringify({ error: String(e) });
      logger.warn("trpg", `工具执行失败: ${tc.function.name} - ${String(e)}`);
    }

    results.push({
      id: tc.id,
      name: tc.function.name,
      arguments: tc.function.arguments,
      result,
    });
  }

  return results;
}

/**
 * v0.8.10: 从文本内容解析 <tool_calls> 文本标签为 ToolCallSpec[]
 *
 * 用于 TRPG Agentic 兜底：当 GLM-5.2 等模型在 TRPG 模式下
 * 输出 <tool_calls>d20_check:...</tool_calls> 文本标签而非 API 原生 delta.tool_calls 时，
 * 从正文内容中解析工具调用，避免骰子/伤害/状态变更丢失。
 *
 * 支持格式：
 *   1. <tool_calls>tool_name:json_args</tool_calls>
 *   2. <tool_calls>tool_name:arg1=val1&arg2=val2</tool_calls>
 *   3. <tool_calls>a:q1|b:q2</tool_calls>（多工具 | 分隔）
 *
 * 注意：TRPG 工具名/参数格式与内置工具不同（d20_check、roll_damage 等），
 * 参数支持 JSON 字符串或 key=value&key=value 格式。
 * 此兜底逻辑仅在 API 原生 toolCalls 为空时触发，不影响原生 function calling。
 */
function parseToolCallsFromText(content: string): ToolCallSpec[] {
  if (!content) return [];

  // 匹配所有 <tool_calls>...</tool_calls> 块
  const toolCallsRegex = /<tool_calls>\s*([\s\S]*?)<\/tool_calls>/gi;
  const results: ToolCallSpec[] = [];
  let match: RegExpExecArray | null;
  let idCounter = 0;

  while ((match = toolCallsRegex.exec(content)) !== null) {
    const inner = match[1].trim();
    if (!inner) continue;

    // 按 | 分隔多工具
    const segments = inner.split("|").map((s) => s.trim()).filter(Boolean);

    for (const seg of segments) {
      // 解析 tool_name:args 格式
      const colonIdx = seg.indexOf(":");
      if (colonIdx === -1) continue;

      // v0.8.10: 去除可能残留的尖括号（兼容 <tool_calls><label:query></tool_calls> 格式）
      const name = seg.substring(0, colonIdx).trim().replace(/^<+|>+$/g, "");
      const argsStr = seg.substring(colonIdx + 1).trim().replace(/^<+|>+$/g, "");

      if (!name) continue;

      // 尝试解析为 JSON，失败则包装为 { query: argsStr } 或 key=value&key=value 格式
      let argumentsJson: string;
      try {
        // 验证是否为合法 JSON
        JSON.parse(argsStr);
        argumentsJson = argsStr;
      } catch {
        // 非 JSON，尝试解析 key=value&key=value 格式
        const parsed: Record<string, string> = {};
        const pairs = argsStr.split("&");
        let hasKv = false;
        for (const pair of pairs) {
          const eqIdx = pair.indexOf("=");
          if (eqIdx > 0) {
            parsed[pair.substring(0, eqIdx).trim()] = pair.substring(eqIdx + 1).trim();
            hasKv = true;
          }
        }
        if (hasKv) {
          argumentsJson = JSON.stringify(parsed);
        } else {
          // 既非 JSON 也非 key=value，包装为 { query: argsStr }
          argumentsJson = JSON.stringify({ query: argsStr });
        }
      }

      results.push({
        id: `text-tc-${Date.now()}-${idCounter++}`,
        function: {
          name,
          arguments: argumentsJson,
        },
      });
    }
  }

  return results;
}

export async function runAgenticToolLoop(params: {
  url: string;
  apiKey: string;
  model: string;
  customRequestBody?: string;
  messages: ApiMessage[];
  tools: Array<unknown>;
  toolExecutor: (name: string, args: Record<string, unknown>) => string;
  firstSystemAppend?: string;
  finalSystemAppend?: string;
  callbacks?: AgenticLoopCallbacks;
  maxLoops?: number;
}): Promise<AgenticLoopResult> {
  const maxLoops = Math.max(1, params.maxLoops ?? 2);

  logger.info("trpg", "第一阶段开始：推理与工具规划");

  const firstMessages = params.firstSystemAppend
    ? replaceSystemPrompt(params.messages, params.firstSystemAppend)
    : params.messages;

  const firstBody = buildApiRequestBody(
    {
      model: params.model,
      messages: firstMessages,
      stream: true,
      temperature: 0.8,
      tools: params.tools,
      tool_choice: "auto",
    },
    {
      thinkingDepth: "auto",
      enableThinking: true,
      customRequestBody: params.customRequestBody,
    },
  );

  const firstResult = await streamAndAccumulate({
    url: params.url,
    apiKey: params.apiKey,
    body: firstBody,
    onReasoningDelta: params.callbacks?.onFirstReasoningDelta,
    onContentDelta: params.callbacks?.onFirstContentDelta,
  });

  logger.info(
    "trpg",
    `第一阶段完成: reasoning=${firstResult.reasoningContent.length}chars content=${firstResult.content.length}chars toolCalls=${firstResult.toolCalls.length}`,
  );

  // v0.8.10: 文本标签兜底 — 若 API 原生 toolCalls 为空但 content 含 <tool_calls> 标签，从文本解析
  // 注意：此兜底逻辑仅在不支持原生 function calling 的模型（如 GLM-5.2）上触发，
  // 不影响已正确返回 delta.tool_calls 的模型。禁止移除此兜底，否则 TRPG 工具调用将失效。
  let effectiveToolCalls = firstResult.toolCalls;
  if (effectiveToolCalls.length === 0 && firstResult.content) {
    const parsedFromText = parseToolCallsFromText(firstResult.content);
    if (parsedFromText.length > 0) {
      logger.info(
        "trpg",
        `v0.8.10 兜底: 从文本解析到 ${parsedFromText.length} 个工具调用（API 原生 toolCalls 为空）`,
      );
      effectiveToolCalls = parsedFromText;
    }
  }

  if (effectiveToolCalls.length === 0) {
    return {
      firstReasoningContent: firstResult.reasoningContent,
      firstContent: firstResult.content,
      finalReasoningContent: firstResult.reasoningContent,
      finalContent: firstResult.content,
      toolCalls: [],
    };
  }

  // v0.8.10: 使用 effectiveToolCalls 替代 firstResult.toolCalls（含兜底解析结果）
  const toolResults = await executeToolCalls(effectiveToolCalls, params.toolExecutor);

  logger.info("trpg", `工具执行完成: ${toolResults.length} 个结果`);

  logger.info("trpg", "第二阶段开始：基于工具结果生成最终回复");

  const assistantToolCallMessage: ApiMessage = {
    role: "assistant",
    content: firstResult.content,
    tool_calls: effectiveToolCalls.map((tc) => ({
      id: tc.id,
      function: tc.function,
    })),
  };

  const toolResultMessages: ApiMessage[] = toolResults.map((tr) => ({
    role: "tool",
    content: tr.result,
    tool_call_id: tr.id,
  }));

  const finalMessagesBase = [...params.messages, assistantToolCallMessage, ...toolResultMessages];

  const finalMessages = params.finalSystemAppend
    ? replaceSystemPrompt(finalMessagesBase, params.finalSystemAppend)
    : finalMessagesBase;

  const finalBody = buildApiRequestBody(
    {
      model: params.model,
      messages: finalMessages,
      stream: true,
      temperature: 0.8,
    },
    {
      thinkingDepth: "auto",
      enableThinking: true,
      customRequestBody: params.customRequestBody,
    },
  );

  const finalResult = await streamAndAccumulate({
    url: params.url,
    apiKey: params.apiKey,
    body: finalBody,
    onReasoningDelta: params.callbacks?.onFinalReasoningDelta,
    onContentDelta: params.callbacks?.onFinalContentDelta,
  });

  logger.info(
    "trpg",
    `第二阶段完成: reasoning=${finalResult.reasoningContent.length}chars content=${finalResult.content.length}chars`,
  );

  if (finalResult.toolCalls.length > 0 && maxLoops > 2) {
    logger.info("trpg", `第二阶段产生新工具调用，进入下一轮 (剩余 ${maxLoops - 2})`);

    const next = await runAgenticToolLoop({
      ...params,
      messages: [
        ...finalMessages,
        {
          role: "assistant",
          content: finalResult.content,
          tool_calls: finalResult.toolCalls.map((tc) => ({
            id: tc.id,
            function: tc.function,
          })),
        },
      ],
      maxLoops: maxLoops - 1,
      firstSystemAppend: undefined,
      finalSystemAppend: undefined,
      callbacks: {
        onFirstReasoningDelta: params.callbacks?.onFinalReasoningDelta,
        onFirstContentDelta: params.callbacks?.onFinalContentDelta,
        onFinalReasoningDelta: params.callbacks?.onFinalReasoningDelta,
        onFinalContentDelta: params.callbacks?.onFinalContentDelta,
      },
    });

    return {
      firstReasoningContent: firstResult.reasoningContent,
      firstContent: firstResult.content,
      finalReasoningContent: next.finalReasoningContent,
      finalContent: next.finalContent,
      toolCalls: [...toolResults, ...next.toolCalls],
    };
  }

  return {
    firstReasoningContent: firstResult.reasoningContent,
    firstContent: firstResult.content,
    finalReasoningContent: finalResult.reasoningContent,
    finalContent: finalResult.content,
    toolCalls: toolResults,
  };
}
