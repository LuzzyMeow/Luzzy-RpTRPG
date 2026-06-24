/**
 * 战斗规则子系统
 * v0.8.0: D&D 5e 战斗裁决
 */

import type { TrpgCharacter, TrpgGameState, DiceResult, DamageResult } from '~/types/trpg';
import { d20Check, rollDamage, abilityModifier, proficiencyBonus } from '../dice';
import { skillBonus } from '../skillBonus';
import type { StateOperation } from '../trpgTools';

/** 战斗裁决参数 */
export interface CombatResolveParams {
  attacker_id: string;
  target_id: string;
  action_type: string;
  weapon?: string;
}

/** 战斗裁决结果 */
export interface CombatResolveResult {
  attackRoll?: DiceResult;
  damage?: DamageResult;
  targetHp?: number;
  conditionsApplied?: string[];
  log: string;
}

/** 解析战斗行动 */
export function resolveCombat(
  args: CombatResolveParams,
  character: TrpgCharacter,
  gameState: TrpgGameState,
): { result: CombatResolveResult; stateOps: StateOperation[] } {
  const stateOps: StateOperation[] = [];
  const isPlayerAttacker = args.attacker_id === character.charId;

  if (args.action_type === 'attack') {
    // 攻击检定
    const weapon = character.equipment.weapon ?? '徒手';
    const strMod = abilityModifier(character.abilities.str);
    const profBonus = proficiencyBonus(character.level);
    const attackBonus = strMod + profBonus;

    const attackRoll = d20Check(attackBonus, 15);

    let damage: DamageResult | undefined;
    if (attackRoll.success) {
      // 伤害掷骰（默认 1d8 + 力量调整值）
      damage = rollDamage('1d8+' + strMod, attackRoll.critical === 'success');
    }

    // 如果目标是 NPC，计算 HP 变更
    const targetNpc = gameState.npcs.find((n) => n.npcId === args.target_id);
    let targetHp: number | undefined;
    if (targetNpc && damage) {
      targetHp = Math.max(0, targetNpc.hp.current - damage.total);
      stateOps.push({
        type: 'hp_change',
        target: args.target_id,
        delta: -damage.total,
      });
    }

    return {
      result: {
        attackRoll,
        damage,
        targetHp,
        log: `攻击检定: d20=${attackRoll.roll}+${attackBonus}=${attackRoll.total} (DC ${attackRoll.dc}) ${attackRoll.success ? '命中' : '未命中'}${damage ? `，伤害 ${damage.total}` : ''}`,
      },
      stateOps,
    };
  }

  if (args.action_type === 'dodge') {
    // 闪避：获得优势对抗攻击
    stateOps.push({
      type: 'condition_add',
      target: 'character',
      condition: 'dodging',
    });
    return {
      result: { log: '采取闪避动作，本回合对角色的攻击检定具有劣势' },
      stateOps,
    };
  }

  if (args.action_type === 'dash') {
    return {
      result: { log: '采取疾跑动作，本回合移动距离加倍' },
      stateOps,
    };
  }

  if (args.action_type === 'disengage') {
    return {
      result: { log: '采取脱离动作，本回合移动不会引发借机攻击' },
      stateOps,
    };
  }

  return {
    result: { log: `未知的战斗行动: ${args.action_type}` },
    stateOps,
  };
}
