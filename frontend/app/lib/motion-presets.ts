/**
 * LUZZY 动画预设
 *
 * 封装常用 motion/react 动画预设，保证全项目动画一致性。
 * 所有预设遵循三态原则：进入（initial/animate）、交互（whileHover/whileTap）、退出（exit）。
 *
 * 用法:
 *   import { springEnter, pressable } from '~/lib/motion-presets';
 *   <motion.div {...springEnter} {...pressable}>...</motion.div>
 */

import type { Transition, Variants } from "motion/react";

// ============================================================================
// 缓动曲线
// ============================================================================

/** 弹性缓动（适合卡片、按钮进入） */
export const springSoft: Transition = {
  type: "spring",
  stiffness: 260,
  damping: 24,
};

/** 弹性缓动（较快，适合列表项） */
export const springSnappy: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 30,
};

/** 弹性缓动（柔和，适合大面板） */
export const springGentle: Transition = {
  type: "spring",
  stiffness: 180,
  damping: 22,
};

/** 惯性缓动（适合侧边栏滑入） */
export const easeInOut: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

/** 快速淡入缓动 */
export const easeFast: Transition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1],
};

// ============================================================================
// 进入/退出动画变体
// ============================================================================

/** 弹簧进入：透明 + 上移 → 不透明 + 归位 */
export const springEnter: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: springSoft, willChange: "transform, opacity" },
  exit: { opacity: 0, y: -10, transition: easeFast, willChange: "transform, opacity" },
};

/** 缩放进入：透明 + 缩小 → 不透明 + 原始大小 */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1, transition: springSoft, willChange: "transform, opacity" },
  exit: { opacity: 0, scale: 0.95, transition: easeFast, willChange: "transform, opacity" },
};

/** 从右滑入：透明 + 右移 → 不透明 + 归位（适合页面切换） */
export const slideInRight: Variants = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0, transition: springSnappy, willChange: "transform, opacity" },
  exit: { opacity: 0, x: -30, transition: easeFast, willChange: "transform, opacity" },
};

/** 从左滑出（配合 slideInRight 使用） */
export const slideOutLeft: Variants = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0, transition: springSnappy, willChange: "transform, opacity" },
  exit: { opacity: 0, x: 30, transition: easeFast, willChange: "transform, opacity" },
};

/** 从下滑入：透明 + 下移 → 不透明 + 归位（适合弹窗、抽屉） */
export const slideInBottom: Variants = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: springGentle, willChange: "transform, opacity" },
  exit: { opacity: 0, y: 40, transition: easeFast, willChange: "transform, opacity" },
};

/** 淡入淡出（最轻量，适合简单切换） */
export const fadeSlide: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: easeInOut, willChange: "transform, opacity" },
  exit: { opacity: 0, y: -8, transition: easeFast, willChange: "transform, opacity" },
};

/** 纯淡入 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: easeInOut, willChange: "opacity" },
  exit: { opacity: 0, transition: easeFast, willChange: "opacity" },
};

// ============================================================================
// 交互动画（whileHover / whileTap）
// ============================================================================

/** 可按压效果：悬停微放大 + 按下缩小 */
export const pressable = {
  whileHover: { scale: 1.05, transition: springSnappy },
  whileTap: { scale: 0.95, transition: easeFast },
};

/** 轻微按压：悬停不动 + 按下微缩（适合图标按钮） */
export const pressableSubtle = {
  whileHover: { scale: 1.02, transition: springSnappy },
  whileTap: { scale: 0.97, transition: easeFast },
};

/** 玻璃悬停：悬停时背景亮度提升（配合 CSS 使用） */
export const glassHover = {
  whileHover: {
    scale: 1.02,
    transition: springSnappy,
  },
  whileTap: {
    scale: 0.98,
    transition: easeFast,
  },
};

// ============================================================================
// 组合预设
// ============================================================================

/** 弹簧进入 + 可按压（最常用组合，适合卡片、按钮） */
export const cardAnimation = {
  ...springEnter,
  ...pressable,
};

/** 缩放进入 + 可按压（适合弹窗内按钮） */
export const buttonAnimation = {
  ...scaleIn,
  ...pressable,
};

/** 淡入 + 轻微按压（适合图标按钮组） */
export const iconButtonAnimation = {
  ...fadeSlide,
  ...pressableSubtle,
};

// ============================================================================
// AnimatePresence 辅助
// ============================================================================

/** 列表项动画（配合 AnimatePresence + layout 使用） */
export const listItemAnimation: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: "auto",
    transition: springSoft,
    willChange: "transform, opacity, height",
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: easeFast,
    willChange: "transform, opacity, height",
  },
};

/** 遮罩层动画（配合 AnimatePresence 使用） */
export const overlayAnimation: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: easeInOut, willChange: "opacity" },
  exit: { opacity: 0, transition: easeFast, willChange: "opacity" },
};

// ============================================================================
// 像素风格动画预设（Pixel Theme）
// ============================================================================

/** 像素风格缓动：阶梯式（4步，无弹性） */
export const pixelStep: Transition = {
  duration: 0.12,
  ease: [0, 0, 0.25, 1],
};

/** 像素风格缓动：线性 snap（用于退出） */
export const pixelSnap: Transition = {
  duration: 0.08,
  ease: "linear",
};

/** 像素弹簧进入 */
export const pixelSpringEnter: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: pixelStep, willChange: "transform, opacity" },
  exit: { opacity: 0, y: -8, transition: pixelSnap, willChange: "transform, opacity" },
};

/** 像素缩放进入 */
export const pixelScaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: pixelStep, willChange: "transform, opacity" },
  exit: { opacity: 0, scale: 0.96, transition: pixelSnap, willChange: "transform, opacity" },
};

/** 像素从右滑入 */
export const pixelSlideInRight: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: pixelStep, willChange: "transform, opacity" },
  exit: { opacity: 0, x: -20, transition: pixelSnap, willChange: "transform, opacity" },
};

/** 像素从下滑入 */
export const pixelSlideInBottom: Variants = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0, transition: pixelStep, willChange: "transform, opacity" },
  exit: { opacity: 0, y: 30, transition: pixelSnap, willChange: "transform, opacity" },
};

/** 像素淡入滑动 */
export const pixelFadeSlide: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: pixelStep, willChange: "transform, opacity" },
  exit: { opacity: 0, y: -6, transition: pixelSnap, willChange: "transform, opacity" },
};

/** 像素纯淡入 */
export const pixelFadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: pixelStep, willChange: "opacity" },
  exit: { opacity: 0, transition: pixelSnap, willChange: "opacity" },
};

/** 像素按压：hover 1px 偏移，tap 1px 偏移（无 scale） */
export const pixelPressable = {
  whileHover: { y: -1, transition: pixelStep },
  whileTap: { y: 1, transition: pixelSnap },
};

/** 像素轻微按压（图标按钮） */
export const pixelPressableSubtle = {
  whileHover: { y: -1, transition: pixelStep },
  whileTap: { y: 0, scale: 0.98, transition: pixelSnap },
};

/** 像素玻璃悬停 */
export const pixelGlassHover = {
  whileHover: { y: -1, transition: pixelStep },
  whileTap: { y: 1, transition: pixelSnap },
};

/** 像素卡片动画 */
export const pixelCardAnimation = {
  ...pixelSpringEnter,
  ...pixelPressable,
};

/** 像素按钮动画 */
export const pixelButtonAnimation = {
  ...pixelScaleIn,
  ...pixelPressable,
};

/** 像素图标按钮动画 */
export const pixelIconButtonAnimation = {
  ...pixelFadeSlide,
  ...pixelPressableSubtle,
};

/** 像素列表项动画 */
export const pixelListItemAnimation: Variants = {
  initial: { opacity: 0, height: 0 },
  animate: {
    opacity: 1,
    height: "auto",
    transition: pixelStep,
    willChange: "transform, opacity, height",
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: pixelSnap,
    willChange: "transform, opacity, height",
  },
};

/** 像素遮罩层动画 */
export const pixelOverlayAnimation: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: pixelStep, willChange: "opacity" },
  exit: { opacity: 0, transition: pixelSnap, willChange: "opacity" },
};
