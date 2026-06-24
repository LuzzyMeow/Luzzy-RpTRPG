/**
 * LUZZY 静态暗色渐变背景组件
 *
 * 提供静态、简洁的暗色调渐变背景，替代原飘动极光效果。
 * 适用于关于页等需要氛围感的场景。
 *
 * - fixed inset-0 定位，脱离滚动流，铺满整个视口（不受滚动影响）
 * - 暗色渐变：使用 CSS 变量适配深浅主题（from-background via-background/95 to-muted/30）
 * - 叠加细微网格纹理（radial-gradient 点阵），低不透明度（6%）
 * - 顶部品牌色微弱渐变光晕（静态，非动画）
 * - 保留 useReducedMotion 无障碍标记（即使无动画也保留语义标记）
 * - pointer-events-none + z-0，始终置于内容之下
 */

import { useReducedMotion } from "motion/react";

import { cn } from "~/lib/utils";

interface LuzzyAuroraBackgroundProps {
  className?: string;
}

export function LuzzyAuroraBackground({ className }: LuzzyAuroraBackgroundProps) {
  // 保留无障碍标记：即使无动画，也用于语义标记和未来扩展
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      data-reduce-motion={reduceMotion ? "on" : "off"}
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background",
        className,
      )}
    >
      {/* 暗色渐变层：从顶部 background 经由 background/95 到底部 muted/30 */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-muted/30" />

      {/* 顶部品牌色微弱渐变光晕（静态，非动画） */}
      <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-primary/5 to-transparent" />

      {/* 细微网格纹理（radial-gradient 点阵），低不透明度 6% */}
      <div
        className="absolute inset-0 text-foreground opacity-[0.06]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
    </div>
  );
}
