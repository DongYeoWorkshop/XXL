// sim_data.js
import { getSkillMultiplier } from './formatter.js';

export const simCharData = {
  "tayangsuyi": {
    customControls: [
      { id: "ally_warrior_debuffer_count", type: "counter", label: "아군 전사/방해 수", min: 0, max: 4, initial: 0 },
      { id: "ally_ult_count", type: "counter", label: "선행 필살 수", min: 0, max: 3, initial: 0 }
    ],
    onTurn: (context) => {
        const { t, charData, stats, simState, customValues } = context;
        const allyCount = customValues.ally_warrior_debuffer_count || 0;
        const skill4 = charData.skills[3];
        const s4Lv = stats.skills?.s4 || 1;
        const isAllyNormalAttackTurn = (t % 4 !== 0);
        
        if (isAllyNormalAttackTurn && allyCount > 0) {
            const prob = (skill4.calc[0].max * getSkillMultiplier(s4Lv, skill4.startRate || 0.6)) / 100;
            for (let i = 0; i < allyCount; i++) {
                if (Math.random() < prob) {
                    simState.battleSpirit = Math.min(9, (simState.battleSpirit || 0) + 1);
                }
            }
        }
    },
    // 범주별 보너스 반환 (곱연산용)
    onCalculateDamage: (context) => {
        const { t, isUlt, stats, simState, customValues, charData } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0 };
        const stacks = simState.battleSpirit || 0;

        // [공통] 9중첩 시 데미지 증가 20% 보너스 (도장 효과)
        if (stacks === 9 && (stats.stamp || false)) {
            bonuses["뎀증"] = 20;
        }
        
        // [추가] 스킬 5: 방어 시 다음 턴까지 보통공격 데미지 증가
        if (!isUlt && simState.afterDefendBonus) {
            const skill5 = charData.skills[4]; // 전의의 기백
            const s5Lv = stats.skills?.s5 || 1;
            // 스킬 5의 첫 번째 계수 (Lv.10 기준 약 30%)
            const bonusVal = skill5.calc[0].max * getSkillMultiplier(s5Lv, skill5.startRate || 0.6);
            bonuses["평타뎀증"] += bonusVal;
        }

        if (isUlt) {
            // 1. 전의 스택 당 6% 필살기 데미지 증가 (9중첩 시 54%)
            let ultBonus = stacks * 6;

            // 2. 선행 필살 수 당 15% 필살기 데미지 증가
            const isAllyUltTurn = (t > 1 && (t - 1) % 3 === 0);
            if (isAllyUltTurn) {
                const allyUltCount = customValues.ally_ult_count || 0;
                ultBonus += (allyUltCount * 15);
            }

            bonuses["필살기뎀증"] = ultBonus;
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, stats, simState } = context;
        
        // 방어 여부 저장 (다음 턴 평타 보너스용)
        simState.afterDefendBonus = isDefend;

        if (isUlt && !(stats.stamp || false)) {
            simState.battleSpirit = 0; // 도장 없으면 스택 소모
        }
    }
  },
  "choiyuhyun": {}, "kumoyama": {}, "khafka": {}, "beernox": {}, "kyrian": {}, "meng": {}, "baade": {}, "locke": {}, "orem": {}, "leo": {}, "tyrantino": {}, "wang": {}, "anuberus": {}, "shinrirang": {}, "tamrang": {}, "goldenryder": {}, "jetblack": {}, "rutenix": {}, "duncan": {}, "famido": {}
};