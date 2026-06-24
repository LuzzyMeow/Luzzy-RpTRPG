/**
 * Think-4 四维评分子系统
 * v0.8.0: 对本轮裁决进行自我评分
 *
 * 四维评分：
 * 1. fairness（公平性，0-10）：本轮裁决对玩家是否公平
 * 2. consistency（一致性，0-10）：与历史剧情/世界设定是否一致
 * 3. consequence（后果性，0-10）：行动是否有合理后果
 * 4. coherence（连贯性，0-10）：叙事是否连贯流畅
 */

import type {
  TrpgCharacter,
  TrpgGameState,
  WorldCard,
  Think4Result,
  NarratorSections,
  DiceResult,
  StateDelta,
} from '~/types/trpg';
import type { StateOperation } from '../trpgTools';

/** Think-4 评分参数 */
export interface Think4ScoringParams {
  /** d20 检定结果 */
  diceResult?: DiceResult;
  /** Narrator 7 段输出 */
  narratorSections?: NarratorSections;
  /** 状态变更列表 */
  stateOps?: StateOperation[];
  /** 状态变更增量 */
  stateDelta?: StateDelta;
  /** 历史 A 级摘要数量 */
  aSummaryCount?: number;
}

/**
 * 评分公平性
 * 基于 d20 检定结果与叙事描述是否匹配
 */
function scoreFairness(
  diceResult?: DiceResult,
  narratorSections?: NarratorSections,
): number {
  let score = 7; // 基础分

  if (diceResult) {
    // 检定结果存在，给予基础分
    score = 8;

    // 大成功增加公平性
    if (diceResult.critical === 'success') {
      score = 10;
    }
    // 大失败略微降低公平性（玩家体验）
    else if (diceResult.critical === 'failure') {
      score = 6;
    }

    // 检定成功但叙事描述过于负面，降低公平性
    if (diceResult.success && narratorSections?.narrative) {
      const negativeWords = ['失败', '错误', '糟糕', '不幸', '受伤'];
      const hasNegative = negativeWords.some((w) =>
        narratorSections.narrative.includes(w),
      );
      if (hasNegative) {
        score = Math.max(4, score - 2);
      }
    }
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * 评分一致性
 * 基于世界卡 laws/mods 和历史 A 级摘要
 */
function scoreConsistency(
  worldCard: WorldCard | null,
  aSummaryCount: number,
  stateOps?: StateOperation[],
): number {
  let score = 7; // 基础分

  // 有世界卡且规则数量多，一致性要求更高
  if (worldCard) {
    const lawCount = worldCard.laws.length;
    const modCount = worldCard.mods.length;

    if (lawCount > 0 || modCount > 0) {
      score = 8; // 有规则约束，基础分更高

      // 状态变更中包含位置变更，检查是否与世界设定一致
      if (stateOps) {
        const hasLocationChange = stateOps.some((op) => op.type === 'location_change');
        if (hasLocationChange && worldCard.worldSetting.length > 0) {
          score = 9; // 位置变更与世界设定关联，一致性高
        }
      }
    }
  }

  // 历史摘要越多，一致性越重要
  if (aSummaryCount > 10) {
    score = Math.min(10, score + 1);
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * 评分后果性
 * 基于状态变更数量和影响范围
 */
function scoreConsequence(stateOps?: StateOperation[]): number {
  if (!stateOps || stateOps.length === 0) {
    return 5; // 无状态变更，后果性中等
  }

  let score = 6;
  const impactWeights: Record<string, number> = {
    hp_change: 2,
    condition_add: 1.5,
    condition_remove: 1.5,
    inventory_add: 1,
    inventory_remove: 1,
    inventory_use: 0.5,
    equipment_equip: 1,
    location_change: 2,
    npc_update: 1.5,
    npc_reveal: 1,
    map_discover: 1,
    map_archive: 0.5,
    time_advance: 1,
    xp_add: 1.5,
    phase_change: 2,
  };

  let totalImpact = 0;
  for (const op of stateOps) {
    totalImpact += impactWeights[op.type] ?? 1;
  }

  // 影响范围越大，后果性越高
  if (totalImpact >= 10) score = 10;
  else if (totalImpact >= 7) score = 9;
  else if (totalImpact >= 5) score = 8;
  else if (totalImpact >= 3) score = 7;
  else if (totalImpact >= 1) score = 6;

  return Math.max(0, Math.min(10, score));
}

/**
 * 评分连贯性
 * 基于 Narrator 7 段输出的完整度
 */
function scoreCoherence(narratorSections?: NarratorSections): number {
  if (!narratorSections) {
    return 4; // 无 Narrator 输出，连贯性低
  }

  let score = 5; // 基础分
  let filledSections = 0;
  const totalSections = 7;

  // 检查每一段是否有内容
  if (narratorSections.memoryRef && narratorSections.memoryRef.trim()) filledSections++;
  if (narratorSections.plotAnalysis && narratorSections.plotAnalysis.trim()) filledSections++;
  if (narratorSections.checkSummary && narratorSections.checkSummary.trim()) filledSections++;
  if (narratorSections.narrative && narratorSections.narrative.trim()) filledSections++;
  if (narratorSections.actionOptions && narratorSections.actionOptions.length > 0) filledSections++;
  if (narratorSections.statusInfo && narratorSections.statusInfo.trim()) filledSections++;
  if (narratorSections.reactReflection && narratorSections.reactReflection.trim()) filledSections++;

  // 根据填充率评分
  const fillRate = filledSections / totalSections;
  if (fillRate >= 1) score = 10;
  else if (fillRate >= 0.85) score = 9;
  else if (fillRate >= 0.7) score = 8;
  else if (fillRate >= 0.5) score = 7;
  else if (fillRate >= 0.3) score = 6;

  // 叙事正文长度也影响连贯性
  if (narratorSections.narrative) {
    const narrativeLength = narratorSections.narrative.length;
    if (narrativeLength < 50) {
      score = Math.max(3, score - 2); // 叙事过短
    } else if (narrativeLength > 200) {
      score = Math.min(10, score + 1); // 叙事详尽
    }
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * 执行 Think-4 四维评分
 * @param args 评分参数
 * @param character 当前角色
 * @param gameState 游戏状态
 * @param worldCard 世界卡（可选）
 * @returns Think-4 评分结果
 */
export function scoreAction(
  args: Think4ScoringParams,
  character: TrpgCharacter,
  gameState: TrpgGameState,
  worldCard: WorldCard | null,
): Think4Result {
  const fairness = scoreFairness(args.diceResult, args.narratorSections);
  const consistency = scoreConsistency(worldCard, args.aSummaryCount ?? 0, args.stateOps);
  const consequence = scoreConsequence(args.stateOps);
  const coherence = scoreCoherence(args.narratorSections);

  const total = (fairness + consistency + consequence + coherence) / 4;

  let verdict: Think4Result['verdict'];
  if (total >= 7.5) {
    verdict = 'pass';
  } else if (total >= 5) {
    verdict = 'warn';
  } else {
    verdict = 'retry';
  }

  return {
    fairness,
    consistency,
    consequence,
    coherence,
    total: Math.round(total * 10) / 10,
    verdict,
  };
}
