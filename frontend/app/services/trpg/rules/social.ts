/**
 * 社交规则子系统
 * v0.8.0: D&D 5e 社交裁决（说服/欺瞒/威吓）
 */

import type { TrpgCharacter, TrpgGameState, NpcAttitude, DiceResult } from '~/types/trpg';
import { d20Check } from '../dice';
import { skillBonus } from '../skillBonus';
import type { StateOperation } from '../trpgTools';

/** 社交裁决参数 */
export interface SocialResolveParams {
  npc_id: string;
  action_type: string;
}

/** 社交裁决结果 */
export interface SocialResolveResult {
  check: DiceResult;
  attitudeShift: number;
  newAttitude: NpcAttitude;
  log: string;
}

const ATTITUDE_ORDER: NpcAttitude[] = ['hostile', 'unfriendly', 'neutral', 'friendly', 'helpful'];

/** 解析社交行动 */
export function resolveSocial(
  args: SocialResolveParams,
  character: TrpgCharacter,
  gameState: TrpgGameState,
): { result: SocialResolveResult; stateOps: StateOperation[] } {
  const stateOps: StateOperation[] = [];
  const npc = gameState.npcs.find((n) => n.npcId === args.npc_id);

  if (!npc) {
    return {
      result: {
        check: { roll: 0, bonus: 0, total: 0, dc: 0, success: false, critical: 'none' },
        attitudeShift: 0,
        newAttitude: 'neutral',
        log: `NPC ${args.npc_id} 不在场`,
      },
      stateOps,
    };
  }

  // 根据行动类型选择技能
  let skill: 'persuasion' | 'deception' | 'intimidation' = 'persuasion';
  if (args.action_type === 'deceive') skill = 'deception';
  else if (args.action_type === 'intimidate') skill = 'intimidation';

  const bonus = skillBonus(character, skill);
  const dc = 10 + (ATTITUDE_ORDER.indexOf(npc.attitude) * 2);
  const check = d20Check(bonus, dc);

  // 态度调整
  let attitudeShift = 0;
  if (check.success) {
    attitudeShift = check.critical === 'success' ? 2 : 1;
  } else {
    attitudeShift = check.critical === 'failure' ? -2 : -1;
  }

  const currentIdx = ATTITUDE_ORDER.indexOf(npc.attitude);
  const newIdx = Math.max(0, Math.min(ATTITUDE_ORDER.length - 1, currentIdx + attitudeShift));
  const newAttitude = ATTITUDE_ORDER[newIdx];

  stateOps.push({
    type: 'npc_update',
    npcId: npc.npcId,
    changes: { attitude: newAttitude },
  });

  return {
    result: {
      check,
      attitudeShift,
      newAttitude,
      log: `${skill}检定: d20=${check.roll}+${bonus}=${check.total} (DC ${dc}) ${check.success ? '成功' : '失败'}，态度从${npc.attitude}变为${newAttitude}`,
    },
    stateOps,
  };
}
