/**
 * 存档管理 Sheet
 *
 * 功能：
 * - 创建新存档（可选世界卡 + 角色名）
 * - 加载存档
 * - 导出存档（JSON 下载）
 * - 删除存档（带确认）
 *
 * 动画：列表项 listItemAnimation，按钮 pressableSubtle
 * 图标：全部来自 game-icon-pack
 */

import * as React from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  IconPlus,
  IconArrow,
  IconExport,
  IconTrash,
  IconBookmark,
  IconClock,
  IconCharacter,
  IconLevel,
  IconSave,
  IconChevronRight,
} from "~/components/luzzy/luzzy-icons";

import { useAppStore } from "~/stores";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useConfirm } from "~/components/luzzy/luzzy-confirm";
import { toast } from "sonner";
import {
  listItemAnimation,
  pressableSubtle,
  springSoft,
  easeFast,
} from "~/lib/motion-presets";
import { logger } from "~/services/logger";

// ============================================================================
// 主组件
// ============================================================================

export function SaveSheet() {
  const trpgAllSaves = useAppStore((s) => s.trpgAllSaves);
  const trpgAllWorldCards = useAppStore((s) => s.trpgAllWorldCards);
  const trpgSave = useAppStore((s) => s.trpgSave);
  const createTrpgSave = useAppStore((s) => s.createTrpgSave);
  const loadTrpgSave = useAppStore((s) => s.loadTrpgSave);
  const deleteTrpgSave = useAppStore((s) => s.deleteTrpgSave);
  const loadAllSaves = useAppStore((s) => s.loadAllSaves);
  const confirm = useConfirm();

  const [selectedWorldCard, setSelectedWorldCard] = React.useState<string>("");
  const [charName, setCharName] = React.useState("冒险者");
  const [isCreating, setIsCreating] = React.useState(false);

  // ===== 创建存档 =====
  const handleCreate = React.useCallback(async () => {
    setIsCreating(true);
    try {
      const worldCardId = selectedWorldCard || null;
      // 如果角色名不是默认值，创建自定义角色
      const customChar =
        charName.trim() && charName !== "冒险者"
          ? { createDefault: true, name: charName.trim() }
          : undefined;

      // createTrpgSave 接收 worldCardId 和可选 character
      // 如果需要自定义角色名，需要传入完整的 TrpgCharacter
      let saveId: string;
      if (customChar) {
        // 动态导入 createDefaultCharacter 或直接构造
        const { v4: uuidv4 } = await import("uuid");
        const customCharacter: import("~/types/trpg").TrpgCharacter = {
          charId: uuidv4(),
          name: charName.trim(),
          race: "人类",
          class: "战士",
          level: 1,
          abilities: { str: 16, dex: 14, con: 15, int: 10, wis: 12, cha: 10 },
          hp: { current: 12, max: 12 },
          ac: 16,
          proficientSkills: ["athletics", "perception"],
          expertiseSkills: [],
          conditions: [],
          inventory: [],
          equipment: { weapon: "长剑", armor: "锁子甲" },
          classFeatures: [],
          xp: 0,
          background: "",
          alignment: "中立",
        };
        saveId = await createTrpgSave(worldCardId, customCharacter);
      } else {
        saveId = await createTrpgSave(worldCardId);
      }

      toast.success("存档创建成功");
      setSelectedWorldCard("");
      setCharName("冒险者");
      await loadAllSaves();
      logger.info("trpg", `创建存档: ${saveId}`);
    } catch (e) {
      logger.error("trpg", "创建存档失败: " + String(e));
      toast.error("创建存档失败");
    } finally {
      setIsCreating(false);
    }
  }, [selectedWorldCard, charName, createTrpgSave, loadAllSaves]);

  // ===== 加载存档 =====
  const handleLoad = React.useCallback(
    async (saveId: string) => {
      try {
        await loadTrpgSave(saveId);
        toast.success("存档已加载");
      } catch (e) {
        logger.error("trpg", "加载存档失败: " + String(e));
        toast.error("加载存档失败");
      }
    },
    [loadTrpgSave],
  );

  // ===== 导出存档 =====
  const handleExport = React.useCallback((save: (typeof trpgAllSaves)[number]) => {
    try {
      const json = JSON.stringify(save, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${save.title}_${save.saveId.slice(0, 8)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("存档已导出");
    } catch (e) {
      logger.error("trpg", "导出存档失败: " + String(e));
      toast.error("导出存档失败");
    }
  }, []);

  // ===== 删除存档 =====
  const handleDelete = React.useCallback(
    async (saveId: string, title: string) => {
      const ok = await confirm({
        title: "删除存档",
        description: `确定要删除存档「${title}」吗？此操作不可撤销。`,
        confirmText: "删除",
        cancelText: "取消",
        destructive: true,
      });
      if (!ok) return;
      try {
        await deleteTrpgSave(saveId);
        toast.success("存档已删除");
      } catch (e) {
        logger.error("trpg", "删除存档失败: " + String(e));
        toast.error("删除存档失败");
      }
    },
    [confirm, deleteTrpgSave],
  );

  // ===== 排序：置顶在前，然后按更新时间倒序 =====
  const sortedSaves = React.useMemo(() => {
    return [...trpgAllSaves].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.updatedAt - a.updatedAt;
    });
  }, [trpgAllSaves]);

  return (
    <ScrollArea className="flex-1">
      {/* ===== 创建区域 ===== */}
      <div className="space-y-3 p-4">
        <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <IconPlus className="size-4 text-primary" />
          <span>创建新存档</span>
        </div>

        {/* 世界卡选择器 */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">世界卡（可选）</label>
          <Select value={selectedWorldCard} onValueChange={setSelectedWorldCard}>
            <SelectTrigger className="w-full" size="sm">
              <SelectValue placeholder="不使用世界卡" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">不使用世界卡</SelectItem>
              {trpgAllWorldCards.map((card) => (
                <SelectItem key={card.metadata.cardId} value={card.metadata.cardId}>
                  {card.metadata.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 角色名输入 */}
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">角色名</label>
          <Input
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
            placeholder="冒险者"
            className="h-8 text-sm"
            maxLength={20}
          />
        </div>

        {/* 创建按钮 */}
        <motion.div {...pressableSubtle}>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full gap-2"
            size="sm"
          >
            <IconPlus className="size-4" />
            {isCreating ? "创建中..." : "创建存档"}
          </Button>
        </motion.div>
      </div>

      {/* ===== 分隔线 ===== */}
      <div className="mx-4 border-t border-border/20" />

      {/* ===== 存档列表 ===== */}
      <div className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <IconSave className="size-4 text-primary" />
            <span>存档列表</span>
          </div>
          <span className="text-xs text-muted-foreground">
            共 {trpgAllSaves.length} 个
          </span>
        </div>

        {sortedSaves.length === 0 ? (
          <EmptySaveList />
        ) : (
          <AnimatePresence mode="popLayout">
            {sortedSaves.map((save) => (
              <motion.div
                key={save.saveId}
                layout
                variants={listItemAnimation}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <SaveCard
                  save={save}
                  isActive={trpgSave?.saveId === save.saveId}
                  onLoad={() => handleLoad(save.saveId)}
                  onExport={() => handleExport(save)}
                  onDelete={() => handleDelete(save.saveId, save.title)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </ScrollArea>
  );
}

// ============================================================================
// 存档卡片
// ============================================================================

function SaveCard({
  save,
  isActive,
  onLoad,
  onExport,
  onDelete,
}: {
  save: {
    saveId: string;
    title: string;
    character: { name: string; level: number; race: string; class: string };
    updatedAt: number;
    pinned?: boolean;
  };
  isActive: boolean;
  onLoad: () => void;
  onExport: () => void;
  onDelete: () => void;
}) {
  const formattedTime = React.useMemo(() => {
    const date = new Date(save.updatedAt);
    const now = Date.now();
    const diff = now - save.updatedAt;
    if (diff < 60000) return "刚刚";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleDateString("zh-CN");
  }, [save.updatedAt]);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={`rounded-lg border p-2.5 transition-colors ${
        isActive
          ? "border-primary/40 bg-primary/5"
          : "border-border/30 bg-background/40 hover:border-border/50"
      }`}
    >
      {/* 头部：标题 + 置顶 + 当前标记 */}
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {save.pinned && (
            <IconBookmark className="size-3 shrink-0 text-amber-500" />
          )}
          <span className="truncate text-sm font-medium text-foreground">
            {save.title}
          </span>
        </div>
        {isActive && (
          <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
            当前
          </span>
        )}
      </div>

      {/* 角色信息 */}
      <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <IconCharacter className="size-3" />
          {save.character.name}
        </span>
        <span className="flex items-center gap-1">
          <IconLevel className="size-3" />
          Lv.{save.character.level}
        </span>
        <span className="flex items-center gap-1">
          <IconClock className="size-3" />
          {formattedTime}
        </span>
      </div>

      {/* 操作按钮 */}
      <div className="mt-2 flex items-center gap-1">
        <motion.button
          type="button"
          onClick={onLoad}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex flex-1 items-center justify-center gap-1 rounded-md bg-primary/10 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          <IconArrow className="size-3" />
          加载
        </motion.button>
        <motion.button
          type="button"
          onClick={onExport}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center rounded-md bg-muted/40 p-1.5 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          aria-label="导出"
        >
          <IconExport className="size-3.5" />
        </motion.button>
        <motion.button
          type="button"
          onClick={onDelete}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center rounded-md bg-destructive/5 p-1.5 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive"
          aria-label="删除"
        >
          <IconTrash className="size-3.5" />
        </motion.button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// 空状态
// ============================================================================

function EmptySaveList() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
      className="flex flex-col items-center justify-center gap-2 py-8 text-center"
    >
      <IconSave className="size-8 text-muted-foreground/40" />
      <p className="text-xs text-muted-foreground">暂无存档</p>
      <p className="text-[10px] text-muted-foreground/60">
        在上方创建你的第一个存档
      </p>
    </motion.div>
  );
}
