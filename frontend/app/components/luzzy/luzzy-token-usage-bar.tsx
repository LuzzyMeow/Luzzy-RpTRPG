/**
 * LUZZY Token 使用统计行组件
 *
 * v0.3.0 新增：
 * - 在 Agent 消息气泡下方展示 token 统计信息
 * - 生成中：实时显示输出 tokens、tok/s、已用时间
 * - 完成后：显示完整统计（输入、缓存、输出、tok/s、总时间）
 * - 纯展示，无点击交互
 * v0.7.2 增强：
 * - K/M 紧凑数字格式
 * - 思考 tokens（reasoningTokens）显示
 * - 工具续写 tokens（toolCallTokens）显示
 * - 图标替换为 game-icon-pack
 * - flex-nowrap 防止折行
 */

import * as React from "react";
import { motion } from "motion/react";

import { IconArrowUp, IconArrowDown } from "~/components/luzzy/luzzy-icons";
import type { TokenUsage } from "~/types/luzzy";

interface LuzzyTokenUsageBarProps {
  /** Token 使用统计（完成后） */
  usage?: TokenUsage;
  /** 是否正在生成中 */
  isGenerating?: boolean;
  /** 生成中实时数据 */
  liveData?: {
    currentTokens: number;
    tokPerSec: number;
    elapsedMs: number;
  };
}

/** v0.7.2: 紧凑数字格式（≥1M → 1.2M，≥1K → 1.2K） */
function formatCompact(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

/** 格式化时间（毫秒 → 秒，保留1位小数） */
function formatTime(ms: number): string {
  return (ms / 1000).toFixed(1);
}

export function LuzzyTokenUsageBar({
  usage,
  isGenerating = false,
  liveData,
}: LuzzyTokenUsageBarProps) {
  // 生成中：实时显示
  if (isGenerating && liveData) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-nowrap items-center gap-1.5 px-1 py-0.5 text-[10px] leading-tight text-muted-foreground/70"
      >
        <IconArrowDown className="size-2.5" />
        <span>{formatCompact(liveData.currentTokens)}</span>
        <span>·</span>
        <span>{liveData.tokPerSec.toFixed(1)} tok/s</span>
        <span>·</span>
        <span>{formatTime(liveData.elapsedMs)}s</span>
        <motion.span
          className="ml-0.5 inline-block size-1 rounded-full bg-primary"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    );
  }

  // 完成后：完整统计
  if (!usage) return null;

  const hasCache = usage.cachedTokens !== undefined && usage.cachedTokens > 0;
  const cacheRate = usage.cacheHitRate ?? 0;
  const hasReasoning = usage.reasoningTokens !== undefined && usage.reasoningTokens > 0;
  const hasToolCall = usage.toolCallTokens !== undefined && usage.toolCallTokens > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-nowrap items-center gap-1.5 px-1 py-0.5 text-[10px] leading-tight text-muted-foreground/70"
    >
      {/* 输入 tokens */}
      <IconArrowUp className="size-2.5 shrink-0" />
      <span>{formatCompact(usage.promptTokens)}</span>

      {/* 缓存信息（命中率为0时不显示） */}
      {hasCache && cacheRate > 0 && (
        <>
          <span className="text-muted-foreground/50">(</span>
          <span>缓存 {formatCompact(usage.cachedTokens!)}</span>
          <span>·</span>
          <span>{cacheRate.toFixed(1)}%</span>
          <span className="text-muted-foreground/50">)</span>
        </>
      )}

      {/* 输出 tokens */}
      <IconArrowDown className="ml-0.5 size-2.5 shrink-0" />
      <span>{formatCompact(usage.completionTokens)}</span>

      {/* v0.7.2: 思考 tokens（reasoningTokens > 0 时显示） */}
      {hasReasoning && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <span>思考 {formatCompact(usage.reasoningTokens!)}</span>
        </>
      )}

      {/* v0.7.2: 工具续写 tokens（toolCallTokens > 0 时显示） */}
      {hasToolCall && (
        <>
          <span className="text-muted-foreground/50">·</span>
          <span>工具 {formatCompact(usage.toolCallTokens!)}</span>
        </>
      )}

      <span>·</span>
      <span>{usage.tokPerSec.toFixed(1)} tok/s</span>
      <span>·</span>
      <span>{formatTime(usage.responseTimeMs)}s</span>
    </motion.div>
  );
}
