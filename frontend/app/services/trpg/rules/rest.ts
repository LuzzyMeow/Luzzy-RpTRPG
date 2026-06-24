/**
 * 休息规则子系统
 * v0.8.0: D&D 5e 短休/长休
 */

import type { TrpgCharacter, TrpgGameState } from '~/types/trpg';
import { abilityModifier } from '../dice';
import type { StateOperation } from '../trpgTools';

/** 休息裁决参数 */
export interface RestResolveParams {
  rest_type: string;
  location_safety: boolean;
}

/** 休息裁决结果 */
export interface RestResolveResult {
  hpRestored: number;
  hitDiceUsed?: number;
  conditionsRemoved: string[];
  timeAdvanced: number;
  log: string;
}

/** 解析休息行动 */
export function resolveRest(
  args: RestResolveParams,
  character: TrpgCharacter,
  gameState: TrpgGameState,
): { result: RestResolveResult; stateOps: StateOperation[] } {
  const stateOps: StateOperation[] = [];

  if (!args.location_safety) {
    return {
      result: {
        hpRestored: 0,
        conditionsRemoved: [],
        timeAdvanced: 0,
        log: '当前位置不安全，无法休息',
      },
      stateOps,
    };
  }

  if (args.rest_type === 'short') {
    // 短休：消耗生命骰恢复 HP
    const conMod = abilityModifier(character.abilities.con);
    const hitDie = character.level; // 简化：使用等级作为生命骰
    const hpRestored = Math.max(1, hitDie + conMod);
    const conditionsRemoved = character.conditions.filter((c) =>
      ['poisoned', 'diseased'].includes(c.toLowerCase()),
    );

    stateOps.push({
      type: 'hp_change',
      target: 'character',
      delta: hpRestored,
    });

    for (const cond of conditionsRemoved) {
      stateOps.push({
        type: 'condition_remove',
        target: 'character',
        condition: cond,
      });
    }

    stateOps.push({
      type: 'time_advance',
      minutes: 60, // 短休 1 小时
    });

    return {
      result: {
        hpRestored,
        hitDiceUsed: 1,
        conditionsRemoved,
        timeAdvanced: 60,
        log: `短休完成，恢复 ${hpRestored} HP，消耗 1 个生命骰，时间推进 1 小时`,
      },
      stateOps,
    };
  }

  if (args.rest_type === 'long') {
    // 长休：恢复全部 HP
    const hpRestored = character.hp.max - character.hp.current;
    const conditionsRemoved = [...character.conditions];

    stateOps.push({
      type: 'hp_change',
      target: 'character',
      delta: hpRestored,
    });

    for (const cond of conditionsRemoved) {
      stateOps.push({
        type: 'condition_remove',
        target: 'character',
        condition: cond,
      });
    }

    stateOps.push({
      type: 'time_advance',
      minutes: 8 * 60, // 长休 8 小时
    });

    return {
      result: {
        hpRestored,
        conditionsRemoved,
        timeAdvanced: 8 * 60,
        log: `长休完成，恢复 ${hpRestored} HP，清除所有状态，时间推进 8 小时`,
      },
      stateOps,
    };
  }

  return {
    result: {
      hpRestored: 0,
      conditionsRemoved: [],
      timeAdvanced: 0,
      log: `未知的休息类型: ${args.rest_type}`,
    },
    stateOps,
  };
}
