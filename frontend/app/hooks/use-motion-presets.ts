/**
 * useMotionPresets — 根据当前配色方案返回对应的动画预设集合
 *
 * green 主题返回翠绿风格预设，white 主题返回标准预设。
 * 用法：const { springEnter, pressable, fadeSlide } = useMotionPresets();
 */
import { useAppStore } from "~/stores";
import {
  springEnter,
  scaleIn,
  slideInRight,
  slideOutLeft,
  slideInBottom,
  fadeSlide,
  fadeIn,
  pressable,
  pressableSubtle,
  glassHover,
  cardAnimation,
  buttonAnimation,
  iconButtonAnimation,
  listItemAnimation,
  overlayAnimation,
} from "~/lib/motion-presets";
import {
  pixelSpringEnter,
  pixelScaleIn,
  pixelSlideInRight,
  // v0.8.10-fix: 新增 pixelSlideOutLeft 替代错误复用的 pixelSlideInRight
  // 原 slideOutLeft: pixelSlideInRight 映射方向错误（initial x=20 从右侧出现，与 slideOutLeft 语义矛盾）
  // 新映射 slideOutLeft: pixelSlideOutLeft 实现真正的镜像方向（initial x=-20 从左侧滑入）
  pixelSlideOutLeft,
  pixelSlideInBottom,
  pixelFadeSlide,
  pixelFadeIn,
  pixelPressable,
  pixelPressableSubtle,
  pixelGlassHover,
  pixelCardAnimation,
  pixelButtonAnimation,
  pixelIconButtonAnimation,
  pixelListItemAnimation,
  pixelOverlayAnimation,
} from "~/lib/motion-presets";

const defaultPresets = {
  springEnter,
  scaleIn,
  slideInRight,
  slideOutLeft,
  slideInBottom,
  fadeSlide,
  fadeIn,
  pressable,
  pressableSubtle,
  glassHover,
  cardAnimation,
  buttonAnimation,
  iconButtonAnimation,
  listItemAnimation,
  overlayAnimation,
};

const pixelPresets = {
  springEnter: pixelSpringEnter,
  scaleIn: pixelScaleIn,
  slideInRight: pixelSlideInRight,
  // v0.8.10-fix: slideOutLeft 改用 pixelSlideOutLeft（与 pixelSlideInRight 方向镜像）
  // 原映射 pixelSlideInRight 的 initial x=20（从右侧出现）与 slideOutLeft 语义矛盾
  // pixelSlideOutLeft 的 initial x=-20（从左侧滑入）/ exit x=20（向右滑出）才是真正的镜像
  slideOutLeft: pixelSlideOutLeft,
  slideInBottom: pixelSlideInBottom,
  fadeSlide: pixelFadeSlide,
  fadeIn: pixelFadeIn,
  pressable: pixelPressable,
  pressableSubtle: pixelPressableSubtle,
  glassHover: pixelGlassHover,
  cardAnimation: pixelCardAnimation,
  buttonAnimation: pixelButtonAnimation,
  iconButtonAnimation: pixelIconButtonAnimation,
  listItemAnimation: pixelListItemAnimation,
  overlayAnimation: pixelOverlayAnimation,
};

export function useMotionPresets() {
  const colorScheme = useAppStore((s) => s.colorScheme);
  return colorScheme === "green" ? pixelPresets : defaultPresets;
}
