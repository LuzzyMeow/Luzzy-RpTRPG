/**
 * 角色卡 Sheet（只读视图）
 *
 * 展示：
 * - 角色基本信息（名称/种族/职业/等级）
 * - 六维属性（str/dex/con/int/wis/cha）
 * - HP/AC/XP
 * - 18项技能（熟练项高亮，专精项特殊标记）
 * - 状态（conditions）
 * - 职业特性（classFeatures）
 * - 背景（background + alignment）
 *
 * 数据只读原则：不提供编辑功能
 * 动画：各区域 fadeSlide，属性卡片 cardAnimation
 * 图标：全部来自 game-icon-pack
 */

import * as React from "react";
import { motion } from "motion/react";
import {
  IconCharacter,
  IconLevel,
  IconHealth,
  IconShield,
  IconStar,
  IconHeart,
  IconSword,
  IconBook,
  IconInfo,
  IconExclamation,
  IconCrown,
} from "~/components/luzzy/luzzy-icons";

import { useAppStore } from "~/stores";
import { ScrollArea } from "~/components/ui/scroll-area";
import { springSoft } from "~/lib/motion-presets";
import type { AbilityName, SkillName, TrpgCharacter } from "~/types/trpg";

// ============================================================================
// 主组件
// ============================================================================

export function CharacterSheet() {
  const trpgSave = useAppStore((s) => s.trpgSave);
  const character = trpgSave?.character;

  if (!character) {
    return <EmptyCharacter />;
  }

  return (
    <ScrollArea className="flex-1">
      {/* ===== 角色头部 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springSoft}
        className="flex flex-col items-center gap-2 p-4"
      >
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-primary/20 bg-primary/5">
          <IconCharacter className="size-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">
            {character.name}
          </h2>
          <p className="text-xs text-muted-foreground">
            {character.race} · {character.class} · Lv.{character.level}
          </p>
        </div>
      </motion.div>

      {/* ===== HP/AC/XP 状态条 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSoft, delay: 0.05 }}
        className="grid grid-cols-3 gap-2 px-4"
      >
        <StatusCard
          icon={<IconHeart className="size-3.5" />}
          label="HP"
          value={`${character.hp.current}/${character.hp.max}`}
          color="text-red-500"
        />
        <StatusCard
          icon={<IconShield className="size-3.5" />}
          label="AC"
          value={String(character.ac)}
          color="text-blue-500"
        />
        <StatusCard
          icon={<IconLevel className="size-3.5" />}
          label="XP"
          value={String(character.xp)}
          color="text-amber-500"
        />
      </motion.div>

      {/* ===== 六维属性 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSoft, delay: 0.1 }}
        className="space-y-2 p-4"
      >
        <SectionTitle icon={<IconStar className="size-3.5" />} title="六维属性" />
        <div className="grid grid-cols-3 gap-2">
          <AbilityCard name="str" label="力量" value={character.abilities.str} />
          <AbilityCard name="dex" label="敏捷" value={character.abilities.dex} />
          <AbilityCard name="con" label="体质" value={character.abilities.con} />
          <AbilityCard name="int" label="智力" value={character.abilities.int} />
          <AbilityCard name="wis" label="感知" value={character.abilities.wis} />
          <AbilityCard name="cha" label="魅力" value={character.abilities.cha} />
        </div>
      </motion.div>

      {/* ===== 技能 ===== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...springSoft, delay: 0.15 }}
        className="space-y-2 px-4 pb-4"
      >
        <SectionTitle icon={<IconBook className="size-3.5" />} title="技能" />
        <div className="grid grid-cols-2 gap-1">
          {SKILL_LIST.map((skill) => (
            <SkillRow
              key={skill.name}
              skill={skill}
              proficient={character.proficientSkills.includes(skill.name)}
              expertise={character.expertiseSkills.includes(skill.name)}
              abilityValue={character.abilities[skill.ability]}
            />
          ))}
        </div>
      </motion.div>

      {/* ===== 状态 ===== */}
      {character.conditions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSoft, delay: 0.2 }}
          className="space-y-2 px-4 pb-4"
        >
          <SectionTitle
            icon={<IconExclamation className="size-3.5" />}
            title="状态"
          />
          <div className="flex flex-wrap gap-1.5">
            {character.conditions.map((cond) => (
              <span
                key={cond}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-600 dark:text-amber-400"
              >
                {cond}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== 职业特性 ===== */}
      {character.classFeatures.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSoft, delay: 0.25 }}
          className="space-y-2 px-4 pb-4"
        >
          <SectionTitle
            icon={<IconSword className="size-3.5" />}
            title="职业特性"
          />
          <div className="space-y-1">
            {character.classFeatures.map((feat, i) => (
              <div
                key={i}
                className="rounded-md border border-border/20 bg-muted/10 px-2.5 py-1.5 text-xs text-muted-foreground"
              >
                {feat}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ===== 背景 ===== */}
      {(character.background || character.alignment) && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...springSoft, delay: 0.3 }}
          className="space-y-2 px-4 pb-4"
        >
          <SectionTitle icon={<IconBook className="size-3.5" />} title="背景" />
          <div className="space-y-1.5 rounded-md border border-border/20 bg-muted/10 p-2.5">
            {character.alignment && (
              <div className="flex items-center gap-1.5 text-xs">
                <IconCrown className="size-3 text-amber-500" />
                <span className="text-muted-foreground">阵营:</span>
                <span className="text-foreground">{character.alignment}</span>
              </div>
            )}
            {character.background && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {character.background}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </ScrollArea>
  );
}

// ============================================================================
// 状态卡片（HP/AC/XP）
// ============================================================================

function StatusCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={springSoft}
      className="flex flex-col items-center gap-0.5 rounded-lg border border-border/20 bg-background/40 p-2"
    >
      <div className={`flex items-center gap-1 ${color}`}>
        {icon}
      </div>
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-foreground">{value}</span>
    </motion.div>
  );
}

// ============================================================================
// 属性卡片
// ============================================================================

function AbilityCard({
  name,
  label,
  value,
}: {
  name: AbilityName;
  label: string;
  value: number;
}) {
  const modifier = Math.floor((value - 10) / 2);
  const modStr = modifier >= 0 ? `+${modifier}` : `${modifier}`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={springSoft}
      className="flex flex-col items-center gap-0.5 rounded-lg border border-border/20 bg-background/40 p-2"
    >
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-lg font-bold text-foreground">{value}</span>
      <span className="text-[10px] font-mono text-primary">{modStr}</span>
    </motion.div>
  );
}

// ============================================================================
// 技能行
// ============================================================================

function SkillRow({
  skill,
  proficient,
  expertise,
  abilityValue,
}: {
  skill: { name: SkillName; label: string; ability: AbilityName };
  proficient: boolean;
  expertise: boolean;
  abilityValue: number;
}) {
  const modifier = Math.floor((abilityValue - 10) / 2);
  // 熟练加值（简化：等级1-4为+2，5-8为+3，9-12为+4，13-16为+5，17-20为+6）
  // 这里只显示基础调整值，实际熟练加值由引擎计算

  return (
    <div
      className={`flex items-center gap-1.5 rounded px-1.5 py-1 text-xs ${
        expertise
          ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : proficient
            ? "bg-primary/5 text-primary"
            : "text-muted-foreground"
      }`}
    >
      {expertise ? (
        <IconStar className="size-3 fill-current" />
      ) : proficient ? (
        <IconStar className="size-3" />
      ) : (
        <span className="size-3" />
      )}
      <span className="min-w-0 flex-1 truncate">{skill.label}</span>
      <span className="font-mono text-[10px]">
        {modifier >= 0 ? `+${modifier}` : modifier}
      </span>
    </div>
  );
}

// ============================================================================
// 区块标题
// ============================================================================

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
      <span className="text-primary">{icon}</span>
      <span>{title}</span>
    </div>
  );
}

// ============================================================================
// 技能列表（18项）
// ============================================================================

const SKILL_LIST: { name: SkillName; label: string; ability: AbilityName }[] = [
  { name: "athletics", label: "运动", ability: "str" },
  { name: "acrobatics", label: "杂技", ability: "dex" },
  { name: "sleight_of_hand", label: "巧手", ability: "dex" },
  { name: "stealth", label: "隐匿", ability: "dex" },
  { name: "arcana", label: "奥秘", ability: "int" },
  { name: "history", label: "历史", ability: "int" },
  { name: "investigation", label: "调查", ability: "int" },
  { name: "nature", label: "自然", ability: "int" },
  { name: "religion", label: "宗教", ability: "int" },
  { name: "animal_handling", label: "驯兽", ability: "wis" },
  { name: "insight", label: "洞悉", ability: "wis" },
  { name: "medicine", label: "医药", ability: "wis" },
  { name: "perception", label: "察觉", ability: "wis" },
  { name: "survival", label: "求生", ability: "wis" },
  { name: "deception", label: "欺瞒", ability: "cha" },
  { name: "intimidation", label: "威吓", ability: "cha" },
  { name: "performance", label: "表演", ability: "cha" },
  { name: "persuasion", label: "说服", ability: "cha" },
];

// ============================================================================
// 空状态
// ============================================================================

function EmptyCharacter() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
      <IconCharacter className="size-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">未加载存档</p>
      <p className="text-xs text-muted-foreground/60">
        请先创建或加载一个存档
      </p>
    </div>
  );
}
