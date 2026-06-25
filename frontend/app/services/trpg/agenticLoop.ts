/**
 * TRPG 两阶段 agentic 工具调用闭环
 *
 * 阶段 1：发送 tools，让模型只输出 reasoning + tool_calls
 * 阶段 2：将 tool_calls 与执行结果回传，让模型生成最终回复
 */

import { sendStreamRequest, buildApiRequestBody, parseSSEChunk } from "~/services/apiClient";
import { logger } from "~/services/logger";
// v0.8.11: 统一从 toolService.ts 导入 parseToolCallsFromText，避免两套解析规则漂移。
// 禁止在本文件内重新实现 parseToolCallsFromText，所有文本标签解析必须复用 toolService 版本。
import { parseToolCallsFromText, type ToolCallSpec } from "~/services/toolService";

// 重新导出 ToolCallSpec 以保持现有 import { ToolCallSpec } from "./agenticLoop" 不变
export type { ToolCallSpec };

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
  // v0.8.11: 透传 AbortSignal，支持用户中止 TRPG agentic 循环
  signal?: AbortSignal;
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
    // v0.8.11: 透传 signal 给 sendStreamRequest，支持中止操作
    signal: params.signal,
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

// v0.8.11: parseToolCallsFromText 已迁移到 toolService.ts 统一维护，本文件不再持有副本。
// 文本标签兜底解析规则必须与 toolService.ts 保持一致，禁止在本文件重新实现。
// 该兜底逻辑仅在 API 原生 toolCalls 为空时触发，用于 GLM-5.2 等不支持原生 function calling 的模型，
// 不影响已正确返回 delta.tool_calls 的模型。禁止删除此兜底，否则 TRPG 工具调用将失效。

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
  // v0.8.11: 透传 AbortSignal，支持用户中止 TRPG agentic 循环
  signal?: AbortSignal;
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
    // v0.8.11: 透传 signal 给第一阶段流式请求
    signal: params.signal,
    onReasoningDelta: params.callbacks?.onFirstReasoningDelta,
    onContentDelta: params.callbacks?.onFirstContentDelta,
  });

  logger.info(
    "trpg",
    `第一阶段完成: reasoning=${firstResult.reasoningContent.length}chars content=${firstResult.content.length}chars toolCalls=${firstResult.toolCalls.length}`,
  );

  // v0.8.11: 文本标签兜底 — 若 API 原生 toolCalls 为空但 content 含 <tool_calls> 标签，从文本解析
  // 此处调用的是 toolService.ts 中的统一 parseToolCallsFromText，禁止在本文件重新实现。
  // 注意：此兜底逻辑仅在不支持原生 function calling 的模型（如 GLM-5.2）上触发，
  // 不影响已正确返回 delta.tool_calls 的模型。禁止移除此兜底，否则 TRPG 工具调用将失效。
  let effectiveToolCalls = firstResult.toolCalls;
  if (effectiveToolCalls.length === 0 && firstResult.content) {
    const parsedFromText = parseToolCallsFromText(firstResult.content);
    if (parsedFromText.length > 0) {
      logger.info(
        "trpg",
        `v0.8.11 兜底: 从文本解析到 ${parsedFromText.length} 个工具调用（API 原生 toolCalls 为空）`,
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

  // v0.8.11: KV 缓存保护（TRPG agentic 第二阶段）
  // 【缓存命中要求】
  // - params.messages 作为历史前缀必须保持稳定（不修改、不重排序、不截断）
  // - 工具调用与工具结果只能以"追加"方式扩展 messages 数组，禁止插入历史前缀中间
  // - finalMessagesBase 由 [...params.messages, assistantToolCallMessage, ...toolResultMessages] 组成，
  //   历史前缀完全保留，工具调用消息与工具结果消息追加在末尾，符合 OpenAI function calling 协议
  // 【与 Chat 模式的差异】
  // - TRPG 使用 OpenAI 协议的 role:"tool" + tool_call_id 回填结果（OpenAI 原生规范）
  // - Chat 模式（chat-slice.ts）使用 role:"user" 包装工具结果（GLM-5.2 等套壳模型方案）
  // - 两种方案均保持历史前缀稳定，不破坏 KV 缓存命中
  // 【禁止修改】
  // - 禁止在 params.messages 中间插入工具调用消息
  // - 禁止将 toolResultMessages 合并到 params.messages 历史前缀中
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
    // v0.8.11: 透传 signal 给第二阶段流式请求
    signal: params.signal,
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
      // v0.8.11: 递归调用时透传 signal
      signal: params.signal,
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
