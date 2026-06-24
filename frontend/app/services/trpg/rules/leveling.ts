/**
 * 升级规则子系统
 * v0.8.0: D&D 5e 经验值与升级
 */

import type { TrpgCharacter } from '~/types/trpg';
import { abilityModifier } from '../dice';
import type { StateOperation } from '../trpgTools';

/** D&D 5e 升级所需经验值表 */
const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

/** 计算升级所需经验值 */
export function calculateXpForLevel(level: number): number {
  return XP_THRESHOLDS[Math.min(level, XP_THRESHOLDS.length - 1)] ?? 355000;
}

/** 检查是否可以升级 */
export function canLevelUp(character: TrpgCharacter): boolean {
  const threshold = calculateXpForLevel(character.level + 1);
  return character.xp >= threshold && character.level < 20;
}

/** 应用升级 */
export function applyLevelUp(
  character: TrpgCharacter,
): { result: { newLevel: number; hpGained: number; proficiencyBonus: number; log: string }; stateOps: StateOperation[] } {
  const stateOps: StateOperation[] = [];

  if (!canLevelUp(character)) {
    return {
      result: {
        newLevel: character.level,
        hpGained: 0,
        proficiencyBonus: 0,
        log: '经验值不足，无法升级',
      },
      stateOps,
    };
  }

  const newLevel = character.level + 1;
  const conMod = abilityModifier(character.abilities.con);
  // 简化：每级恢复 1d8 + CON 修正值（实际应根据职业生命骰）
  const hpGained = Math.max(1, 5 + conMod); // 平均掷骰 4.5 + conMod，取 5 作为平均值

  stateOps.push({
    type: 'hp_change',
    target: 'character',
    delta: hpGained,
  });

  return {
    result: {
      newLevel,
      hpGained,
      proficiencyBonus: 2 + Math.floor((newLevel - 1) / 4),
      log: `升级到 ${newLevel} 级！HP 上限增加 ${hpGained}，熟练加值提升`,
    },
    stateOps,
  };
}

/** 添加经验值并检查升级 */
export function addXp(
  character: TrpgCharacter,
  amount: number,
): { result: { newXp: number; leveledUp: boolean; newLevel: number }; stateOps: StateOperation[] } {
  const stateOps: StateOperation[] = [];
  const newXp = character.xp + amount;

  stateOps.push({
    type: 'xp_add',
    amount,
  });

  const leveledUp = newXp >= calculateXpForLevel(character.level + 1);

  return {
    result: {
      newXp,
      leveledUp,
      newLevel: leveledUp ? character.level + 1 : character.level,
    },
    stateOps,
  };
}
