// sim_data.js
import { getSkillMultiplier } from './formatter.js';

/**
 * 시뮬레이션 공통 로직 헬퍼
 */
const simHelpers = {
    updateTimers: (simState, keys) => {
        keys.forEach(key => { if (simState[key] > 0) simState[key]--; });
    },
    rollActionBuff: (simState, key, prob, duration = 2) => {
        if (Math.random() < prob) { simState[key] = duration; return true; }
        return (simState[key] || 0) > 0;
    },
    rollHitBuff: (simState, key, prob, duration = 3) => {
        if (Math.random() < prob) { simState[key] = duration; return true; }
        return (simState[key] || 0) > 0;
    },
    getSkillVal: (skill, level, baseVal) => {
        const val = (baseVal !== undefined) ? baseVal : (skill && skill.calc && skill.calc[0]) ? (skill.calc[0].max || skill.calc[0].fixed || 0) : 0;
        return val * getSkillMultiplier(level, skill.startRate || 0.6);
    },
    // [추가] 로그 템플릿 헬퍼
    addLog: (logs, name, result = "발동") => {
        if (logs) logs.push(`[${name}] ${result}`);
    }
};

export const simCharData = {
  "tayangsuyi": {
    customControls: [
      { id: "ally_warrior_debuffer_count", type: "counter", label: "아군 전사/방해 수", min: 0, max: 4, initial: 0 },
      { id: "ally_ult_count", type: "counter", label: "선행 필살 수", min: 0, max: 3, initial: 0 }
    ],
    onTurn: (context) => {
        const { t, charData, stats, simState, customValues, debugLogs } = context;
        simHelpers.updateTimers(simState, ['afterDefendBonus']);
        const allyCount = customValues.ally_warrior_debuffer_count || 0;
        const skill4 = charData.skills[3];
        const s4Lv = stats.skills?.s4 || 1;
        if (t % 4 !== 0 && allyCount > 0) {
            const prob = simHelpers.getSkillVal(skill4, s4Lv, skill4.calc[0].max) / 100;
            for (let i = 0; i < allyCount; i++) { 
                if (Math.random() < prob) {
                    simState.battleSpirit = Math.min(9, (simState.battleSpirit || 0) + 1);
                    simHelpers.addLog(debugLogs, "전의", "획득");
                }
            }
        }
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, customValues, charData, t, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const stacks = simState.battleSpirit || 0;
        if (stacks === 9 && (stats.stamp || false)) {
            const s8 = charData.skills[7];
            const boostVal = (s8.stampBuffEffects && s8.stampBuffEffects["뎀증"]) ? (s8.stampBuffEffects["뎀증"].fixed || s8.stampBuffEffects["뎀증"].max || 20) : 20;
            bonuses["뎀증"] += boostVal; 
            simHelpers.addLog(debugLogs, "전의", "최대 중첩 보너스");
        }
        if (!isUlt && simState.afterDefendBonus > 0) {
            const s5 = charData.skills[4];
            bonuses["평타뎀증"] += simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.calc[0].max);
            simHelpers.addLog(debugLogs, s5.name, "적용");
        }
        if (isUlt) {
            const s4 = charData.skills[3]; 
            const stackBonus = (s4.calc && s4.calc[1]) ? (s4.calc[1].fixed || 6) : 6; 
            let ultBonus = stacks * stackBonus;
            const s7 = charData.skills[6];
            const s7Val = simHelpers.getSkillVal(s7, stats.skills?.s7 || 1, s7.calc[0].max);
            if (t > 1 && (t - 1) % 3 === 0) {
                const add = ((customValues.ally_ult_count || 0) * s7Val);
                if (add > 0) { ultBonus += add; simHelpers.addLog(debugLogs, s7.name, "적용"); }
            }
            bonuses["필살기뎀증"] = ultBonus;
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, stats, simState, debugLogs } = context;
        if (isDefend) {
            simState.afterDefendBonus = 2;
            simHelpers.addLog(debugLogs, "워밍업 함성", "준비");
        }
        if (isUlt && !(stats.stamp || false)) simState.battleSpirit = 0;
    }
  },

  "choiyuhyun": {
    customControls: [{ id: "hp_full_rate", type: "input", label: "HP 100% 유지율(%)", min: 0, max: 100, initial: 100 }],
    onCalculateDamage: (context) => {
        const { isUlt, charData, stats, simState, customValues, targetCount, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const s4 = charData.skills[3];
        const hpFullBonus = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[0].max);
        if (Math.random() * 100 < (customValues.hp_full_rate || 0)) {
            bonuses["뎀증"] += hpFullBonus;
            simHelpers.addLog(debugLogs, s4.name, "성공");
        }
        if (isUlt && stats.stamp && targetCount >= 5) {
            const s8 = charData.skills[7];
            const boostVal = (s8.calc && s8.calc[0]) ? (s8.calc[0].stampMax || s8.calc[0].max || 20) : 20;
            bonuses["뎀증"] += boostVal;
            simHelpers.addLog(debugLogs, s8.name, "적용");
        }
        if (simState.choi_passive3_ready) { 
            const s5 = charData.skills[4];
            const s5Val = simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.calc[0].max);
            bonuses.extraHits.push({ coef: s5Val, isMulti: false, skillId: "choiyuhyun_skill5", name: s5.name }); 
            simState.choi_passive3_ready = false; 
            simHelpers.addLog(debugLogs, s5.name, "발동");
        }
        if (isUlt) {
            const s7 = charData.skills[6]; const rate = getSkillMultiplier(stats.skills?.s7 || 1, s7.startRate || 0.6);
            if (targetCount >= 5) {
                bonuses.extraHits.push({ coef: s7.calc[0].max * rate, isMulti: true, skillId: "choiyuhyun_skill7", name: s7.name });
                simHelpers.addLog(debugLogs, s7.name, "다수 적");
            } else if (targetCount === 1) {
                bonuses.extraHits.push({ coef: s7.calc[1].max * rate, isMulti: false, skillId: "choiyuhyun_skill7", name: s7.name });
                simHelpers.addLog(debugLogs, s7.name, "단일 적");
            }
        }
        return bonuses;
    },
    onAfterAction: (context) => { 
        const { simState, isDefend, debugLogs } = context;
        if (isDefend) { simState.choi_passive3_ready = true; simHelpers.addLog(debugLogs, "신화성신환", "준비"); }
    }
  },

  "kumoyama": {
    customControls: [
      { id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 },
      { id: "ult_hit_count", type: "counter", label: "필살 턴 피격 횟수", min: 0, max: 5, initial: 3 }
    ],
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['p2_timer', 'p3_timer']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, customValues, charData, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const s4 = charData.skills[3], s5 = charData.skills[4], s7 = charData.skills[6];
        const p2_v = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[0].max);
        const p3_v = simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.calc[0].max);
        const p5_v = simHelpers.getSkillVal(s7, stats.skills?.s7 || 1, s7.calc[0].max);
        if (simState.p2_timer > 0) bonuses["뎀증"] += p2_v;
        if (simState.p3_timer > 0) bonuses["뎀증"] += p3_v;
        if (isUlt) {
            bonuses["뎀증"] += p5_v; simHelpers.addLog(debugLogs, s7.name, "적용");
            if (simHelpers.rollActionBuff(simState, 'p2_timer', 0.5)) { 
                simHelpers.addLog(debugLogs, s4.name, "성공");
                if (!(simState.p2_timer > 0)) bonuses["뎀증"] += p2_v; 
            }
            const hits = customValues.ult_hit_count || 0;
            const s2 = charData.skills[1]; const s2Rate = getSkillMultiplier(stats.skills?.s2 || 1, s2.startRate || 0.6);
            for (let i = 0; i < hits; i++) {
                if (simHelpers.rollHitBuff(simState, 'p3_timer', 0.5)) { 
                    simHelpers.addLog(debugLogs, s5.name, "성공");
                    if (bonuses["뎀증"] < (p2_v + p3_v + p5_v)) bonuses["뎀증"] += p3_v; 
                }
                const extraVal = stats.stamp ? s2.damageDeal[0].val.stampMax : s2.damageDeal[0].val.max;
                bonuses.extraHits.push({ coef: extraVal * s2Rate, isMulti: stats.stamp, skillId: "kumoyama_skill2", name: s2.name });
            }
            bonuses.skipMainDamage = true;
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { simState, customValues, isUlt, isDefend, charData, debugLogs } = context;
        if (!isUlt && !isDefend) {
            if (Math.random() < 0.5) { simState.p2_timer = 2; simHelpers.addLog(debugLogs, charData.skills[3].name, "성공"); }
            const hitProb = (customValues.normal_hit_prob || 0) / 100;
            if (Math.random() < hitProb * 0.5) { simState.p3_timer = 2; simHelpers.addLog(debugLogs, charData.skills[4].name, "피격 성공"); }
        }
    }
  },

  "khafka": {
    customControls: [{ id: "is_paralysis_immune", type: "toggle", label: "대상 마비 면역", initial: false }],
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['p2_timer', 'p3_timer']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, customValues, charData, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, extraHits: [] };
        const s4 = charData.skills[3], s5 = charData.skills[4], s8 = charData.skills[7];
        if (simState.p2_timer > 0) bonuses["뎀증디버프"] += simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[0].max);
        if (simState.p3_timer > 0) bonuses["뎀증디버프"] += simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.calc[0].max);
        if (isUlt && (customValues.is_paralysis_immune === true || customValues.is_paralysis_immune === 'true')) {
            bonuses["필살기뎀증"] += (s8.calc[0].max * getSkillMultiplier(stats.skills?.s4 || 1, 0.6));
            simHelpers.addLog(debugLogs, s8.name, "면역 추뎀");
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { simState, isDefend, debugLogs, charData, isUlt } = context;
        if (!isDefend && !isUlt) {
            if (Math.random() < 0.5) { simState.p2_timer = 2; simHelpers.addLog(debugLogs, charData.skills[3].name, "성공"); }
        } else if (isDefend) {
            simState.p3_timer = 2; simHelpers.addLog(debugLogs, charData.skills[4].name, "준비");
        }
    }
  },

  "baade": {
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['p5_timer']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const s4 = charData.skills[3], s5 = charData.skills[4], s7 = charData.skills[6];
        if (simState.scar_active) {
            bonuses["필살기뎀증"] += simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[0].max);
            bonuses["평타뎀증"] += simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.calc[0].max);
        }
        if (simState.p5_timer > 0) { bonuses["필살기뎀증"] += simHelpers.getSkillVal(s7, stats.skills?.s7 || 1, s7.calc[0].max); simHelpers.addLog(debugLogs, s7.name, "적용"); }
        if (isUlt && simState.scar_active && stats.stamp) {
            const s2 = charData.skills[1];
            bonuses.extraHits.push({ coef: s2.calc[1].max * getSkillMultiplier(stats.skills?.s2 || 1, s2.startRate || 0.6), skillId: "baade_stamp_passive", name: s2.name });
            simHelpers.addLog(debugLogs, "각흔", "추가타");
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, debugLogs } = context;
        if (isUlt) { simState.scar_active = !simState.scar_active; simHelpers.addLog(debugLogs, "각흔", simState.scar_active ? "부여" : "해제"); }
        else if (!isDefend && simState.scar_active) { simState.p5_timer = 2; }
    }
  },

  "locke": {
    customControls: [
      { id: "enemy_hp", type: "input", label: "적 HP(%)", min: 0, max: 100, initial: 100 },
      { id: "auto_hp", type: "toggle", label: "자동", initial: false },
      { id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 }
    ],
    onTurn: (context) => {
        const { t, turns, simState, customValues } = context;
        if (customValues.auto_hp) simState.current_hp = (turns > 1) ? Math.max(0, 100 - (100 * (t - 1) / (turns - 1))) : 100;
        else simState.current_hp = customValues.enemy_hp;
        if (!simState.mark_timers) simState.mark_timers = [];
        if (!simState.p3_timers) simState.p3_timers = [];
        simState.mark_timers = simState.mark_timers.map(v => v - 1).filter(v => v > 0);
        simState.p3_timers = simState.p3_timers.map(v => v - 1).filter(v => v > 0);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const s3 = charData.skills[3], s4 = charData.skills[4];
        const s3Val = simHelpers.getSkillVal(s3, stats.skills?.s4 || 1, s3.calc[0].max);
        if (simState.current_hp < 75) bonuses["뎀증"] += s3Val;
        if (simState.current_hp < 50) bonuses["뎀증"] += s3Val;
        if (simState.current_hp < 25) bonuses["뎀증"] += s3Val;
        const p3Count = (simState.p3_timers || []).length;
        bonuses["뎀증"] += (p3Count * simHelpers.getSkillVal(s4, stats.skills?.s5 || 1, s4.calc[0].max));
        if (isUlt) {
            const markCount = (simState.mark_timers || []).length;
            if (stats.stamp && markCount >= 2) {
                const s7 = charData.skills[7];
                bonuses["필살기뎀증"] += simHelpers.getSkillVal(s7, stats.skills?.s2 || 1, s7.calc[0].max);
                simHelpers.addLog(debugLogs, s7.name, "성공");
            }
            if (markCount >= 2 || simState.current_hp < 25) {
                const s6 = charData.skills[6];
                bonuses.extraHits.push({ coef: s6.calc[0].max * getSkillMultiplier(stats.skills?.s7 || 1, 0.6), skillId: "locke_skill7", name: s6.name });
                simHelpers.addLog(debugLogs, s6.name, "발동");
            }
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, customValues, debugLogs } = context;
        if (!isUlt && !isDefend && simState.current_hp >= 50) {
            if (!simState.mark_timers) simState.mark_timers = [];
            simState.mark_timers.push(5); simHelpers.addLog(debugLogs, "호혈표지", "획득");
        }
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb && Math.random() < 0.5) {
            if (!simState.p3_timers) simState.p3_timers = [];
            if (simState.p3_timers.length < 3) simState.p3_timers.push(3); else simState.p3_timers[0] = 3;
            simHelpers.addLog(debugLogs, "분노의 해류", "성공");
        }
    }
  },

  "tyrantino": {
    customControls: [{ id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 }],
    onTurn: (context) => {
        const { simState } = context;
        simHelpers.updateTimers(simState, ['p5_dr_timer']);
        if (!simState.pressure_timers) simState.pressure_timers = [];
        simState.pressure_timers = simState.pressure_timers.map(v => v - 1).filter(v => v > 0);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const s6 = charData.skills[6];
        if (isUlt || (simState.p5_dr_timer > 0)) { bonuses["뎀증"] += simHelpers.getSkillVal(s6, stats.skills?.s7 || 1, s6.calc[0].max); simHelpers.addLog(debugLogs, s6.name, "적용"); }
        if ((simState.pressure_timers || []).length >= 3) {
            const s4 = charData.skills[4];
            bonuses.extraHits.push({ coef: simHelpers.getSkillVal(s4, stats.skills?.s5 || 1, s4.damageDeal[0].val.max), isMulti: true, skillId: "tyrantino_skill5", name: s4.name });
            simHelpers.addLog(debugLogs, s4.name, "발동");
        }
        if (isUlt && (simState.rage_count || 0) >= 3) {
            const s3 = charData.skills[3];
            bonuses.extraHits.push({ coef: simHelpers.getSkillVal(s3, stats.skills?.s4 || 1, s3.damageDeal[0].val.max), isMulti: true, skillId: "tyrantino_skill4", name: s3.name });
            simHelpers.addLog(debugLogs, s3.name, "발동");
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, simState, stats, customValues, debugLogs } = context;
        if (isUlt) {
            simState.p5_dr_timer = 2;
            if (stats.stamp) { for(let i=0; i<3; i++) { if(!simState.pressure_timers) simState.pressure_timers = []; simState.pressure_timers.push(2); } }
            simState.rage_count = 0;
        }
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb) {
            simState.rage_count = Math.min(3, (simState.rage_count || 0) + 1);
            if (stats.stamp) { if(!simState.pressure_timers) simState.pressure_timers = []; simState.pressure_timers.push(3); }
            simHelpers.addLog(debugLogs, "용족의 위압", "성공");
        }
    }
  },

  "anuberus": {
    onTurn: (context) => {
        const { simState } = context;
        simHelpers.updateTimers(simState, ['black_dog_timer', 'white_dog_timer']);
        if (!simState.attr_debuff_timers) simState.attr_debuff_timers = [];
        if (!simState.hellhound_timers) simState.hellhound_timers = [];
        simState.attr_debuff_timers = simState.attr_debuff_timers.map(v => v - 1).filter(v => v > 0);
        simState.hellhound_timers = simState.hellhound_timers.map(v => v - 1).filter(v => v > 0);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "속성디버프": 0, extraHits: [] };
        const s4 = charData.skills[3];
        const debuffVal = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[1].max);
        bonuses["속성디버프"] += ((simState.attr_debuff_timers || []).length * debuffVal);
        if (stats.stamp) {
            const s7 = charData.skills[7], ultName = charData.skills[1].name;
            if (simState.black_dog_timer > 0) bonuses.extraHits.push({ coef: s7.damageDeal[0].val.max, skillId: "anuberus_stamp_passive", name: ultName });
            if (simState.white_dog_timer > 0) bonuses.extraHits.push({ coef: s7.damageDeal[0].val.max, skillId: "anuberus_stamp_passive", name: ultName });
        }
        if (isUlt) {
            const s6 = charData.skills[6], p5_val = simHelpers.getSkillVal(s6, stats.skills?.s7 || 1, s6.calc[0].max);
            if (simState.black_dog_timer > 0) bonuses["필살기뎀증"] += p5_val;
            if (simState.white_dog_timer > 0) bonuses["필살기뎀증"] += p5_val;
            const houndCount = (simState.hellhound_timers || []).length;
            const s5 = charData.skills[4], hound_coef = simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.damageDeal[0].val.max);
            for (let i = 0; i < houndCount; i++) bonuses.extraHits.push({ coef: hound_coef, skillId: "anuberus_skill5", name: s5.name });
            if (houndCount > 0) simHelpers.addLog(debugLogs, s5.name, `${houndCount}회 발동`);
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { simState, isDefend, debugLogs } = context;
        if (!isDefend) {
            if (Math.random() < 0.5) { simState.black_dog_timer = 2; simHelpers.addLog(debugLogs, "흑구", "각성"); }
            if (Math.random() < 0.5) { simState.white_dog_timer = 2; simHelpers.addLog(debugLogs, "백구", "각성"); }
        }
    }
  },

  "shinrirang": {
    customControls: [{ id: "normal_hit_prob", type: "input", label: "보통공격 피격 확률(%)", min: 0, max: 100, initial: 30 }],
    onTurn: (context) => {
        const { simState } = context;
        if (!simState.p3_timers) simState.p3_timers = [];
        simState.p3_timers = simState.p3_timers.map(v => v - 1).filter(v => v > 0);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, customValues, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const s6 = charData.skills[6], atkStackVal = s6.calc[0].max;
        const addAtkStack = () => { simState.atk_stacks = Math.min(10, (simState.atk_stacks || 0) + 1); bonuses["공증"] = (simState.atk_stacks || 0) * atkStackVal; };
        bonuses["공증"] = (simState.atk_stacks || 0) * atkStackVal;
        const s4 = charData.skills[4], hitDmgBoost = s4.calc[1].max;
        bonuses["뎀증"] += ((simState.p3_timers || []).length * hitDmgBoost);
        addAtkStack();
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb) {
            bonuses.extraHits.push({ coef: s4.calc[0].max * getSkillMultiplier(stats.skills?.s5 || 1, 0.6), skillId: "shinrirang_skill5", name: s4.name });
            addAtkStack(); if (simState.p3_timers.length < 2) simState.p3_timers.push(3); else simState.p3_timers[0] = 3;
            simHelpers.addLog(debugLogs, s4.name, "반격");
        }
        if (isUlt) {
            const s3 = charData.skills[3], s7 = charData.skills[7];
            if (Math.random() < 0.5) bonuses["트리거뎀증"] += simHelpers.getSkillVal(s3, stats.skills?.s4 || 1, s3.calc[0].max);
            if (Math.random() < 0.5) { bonuses.extraHits.push({ coef: simHelpers.getSkillVal(s3, stats.skills?.s4 || 1, s3.calc[1].max), skillId: "shinrirang_skill4", name: s3.name }); addAtkStack(); simHelpers.addLog(debugLogs, s3.name, "성공"); }
            if (stats.stamp) {
                if (Math.random() < 0.5) bonuses["트리거뎀증"] += simHelpers.getSkillVal(s7, stats.skills?.s2 || 1, s7.calc[0].max);
                if (Math.random() < 0.5) { bonuses.extraHits.push({ coef: simHelpers.getSkillVal(s7, stats.skills?.s2 || 1, s7.damageDeal[0].val.max), skillId: "shinrirang_skill8", name: charData.skills[1].name }); addAtkStack(); simHelpers.addLog(debugLogs, "도장", "성공"); }
            }
        }
        return bonuses;
    },
    onAfterAction: (context) => {}
  },

  "tamrang": {
    customControls: [
        { id: "use_sleep_buff_self", type: "toggle", label: "수면디버프 본인적용", initial: true },
        { id: "sleep_success_rate", type: "input", label: "수면 성공 확률(%)", min: 0, max: 100, initial: 40 },
        { id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 }
    ],
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['p1_debuff', 'p4_debuff']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, extraHits: [] };
        if (simState.p1_debuff > 0) bonuses["뎀증디버프"] += simHelpers.getSkillVal(charData.skills[3], stats.skills?.s4 || 1, charData.skills[3].calc[0].max);
        if (simState.p4_debuff > 0) bonuses["뎀증디버프"] += simHelpers.getSkillVal(charData.skills[6], stats.skills?.s7 || 1, charData.skills[6].calc[0].max);
        if (simState.sleep_status) {
            bonuses["뎀증"] += simHelpers.getSkillVal(charData.skills[4], stats.skills?.s5 || 1, charData.skills[4].calc[0].max);
            if (simState.sleep_status.has_stamp_bonus) bonuses["뎀증디버프"] += charData.skills[7].calc[0].fixed || 75; 
            simState.sleep_status = null;
            simHelpers.addLog(debugLogs, "수면 폭딜", "적용");
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, customValues, stats, debugLogs, charData } = context;
        if (isUlt) {
            simState.p4_debuff = 1; simHelpers.addLog(debugLogs, charData.skills[6].name, "성공");
            if (Math.random() * 100 < (customValues.sleep_success_rate || 40)) { simState.sleep_status = { has_stamp_bonus: (stats.stamp === true) }; simHelpers.addLog(debugLogs, "수면", "성공"); }
            if (!customValues.use_sleep_buff_self && simState.sleep_status) simState.sleep_status = null;
        } else if (!isDefend && Math.random() < 0.5) { simState.p1_debuff = 2; simHelpers.addLog(debugLogs, charData.skills[3].name, "성공"); }
    }
  },

  "jetblack": {
    onTurn: (context) => {
        const { t, simState } = context;
        simHelpers.updateTimers(simState, ['p3_timer', 'ult_timer']);
        if (t % 4 !== 0) { for (let i = 0; i < 4; i++) { if (Math.random() < 0.33) simState.stamina_stacks = Math.min(6, (simState.stamina_stacks || 0) + 1); } }
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, isDefend, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        if (isUlt) simState.ult_timer = 3;
        if (simState.p3_timer > 0) bonuses["트리거뎀증"] += charData.skills[4].calc[0].max;
        if (simState.ult_timer > 0) bonuses["트리거뎀증"] += charData.skills[7].calc[0].max;
        const lvVal = parseInt(stats.lv || 1), brVal = parseInt(stats.s1 || 0), fitVal = parseInt(stats.s2 || 0);
        const finalBaseAtk = Math.floor(charData.base["공격력"] * Math.pow(1.05, (lvVal - 1)) * (1 + brVal * 0.02) * (1 + fitVal * 0.04) * 1.15);
        if (simState.ult_timer > 0) {
            const s2 = charData.skills[1]; bonuses["고정공증"] = (bonuses["고정공증"] || 0) + Math.floor(finalBaseAtk * (s2.ratioEffects.고정공증.max * getSkillMultiplier(stats.skills?.s2 || 1, 0.6) / 100));
        }
        if (isUlt && (simState.stamina_stacks || 0) >= 6) {
            const s3 = charData.skills[3]; bonuses.extraHits.push({ coef: s3.calc[0].max * getSkillMultiplier(stats.skills?.s4 || 1, 0.6), skillId: "jetblack_skill4", name: s3.name });
            simState.consume_stamina = true; simHelpers.addLog(debugLogs, "체력응축", "폭발");
        } else if (!isDefend) {
            const s1 = charData.skills[0]; bonuses["고정공증"] = (bonuses["고정공증"] || 0) + Math.floor(finalBaseAtk * (s1.ratioEffects.고정공증.max * getSkillMultiplier(stats.skills?.s1 || 1, 0.6) / 100));
            const s6 = charData.skills[6]; bonuses.extraHits.push({ coef: s6.calc[0].max * getSkillMultiplier(stats.skills?.s7 || 1, 0.6), skillId: "jetblack_skill7", name: s6.name });
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, debugLogs, charData } = context;
        if (isUlt) { if (simState.consume_stamina) { simState.stamina_stacks = 0; simState.consume_stamina = false; } }
        else if (!isDefend) { 
            if (Math.random() < 0.5) { simState.p3_timer = 2; simHelpers.addLog(debugLogs, charData.skills[4].name, "성공"); }
            simState.stamina_stacks = Math.min(6, (simState.stamina_stacks || 0) + 1); 
        }
    }
  },

  "wang": {
    customControls: [{ id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 }],
    onTurn: (context) => {
        const { simState } = context;
        simHelpers.updateTimers(simState, ['ult_buff_timer']);
        if (!simState.p4_timers) simState.p4_timers = [];
        simState.p4_timers = simState.p4_timers.map(v => v - 1).filter(v => v > 0);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const s5 = charData.skills[4];
        bonuses["뎀증"] += ((simState.p4_timers || []).length * simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.calc[0].max));
        if (isUlt) bonuses.skipMainDamage = true;
        else if (simState.ult_buff_timer > 0) {
            const s2 = charData.skills[1], s2Rate = getSkillMultiplier(stats.skills?.s2 || 1, s2.startRate || 0.6), extra_coef = (s2.stampBuffEffects?.추가데미지?.max || 20) * s2Rate;
            bonuses.extraHits.push({ coef: extra_coef, skillId: "wang_skill2", name: s2.name });
            if (stats.stamp && Math.random() < 0.5) { bonuses.extraHits.push({ coef: extra_coef, skillId: "wang_skill2", name: s2.name }); simHelpers.addLog(debugLogs, "도장 추가타", "성공"); }
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, simState, customValues, debugLogs, charData } = context;
        if (isUlt) { simState.ult_buff_timer = 3; }
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb) {
            if (simState.p4_timers.length < 2) simState.p4_timers.push(3); else simState.p4_timers[0] = 3;
            simHelpers.addLog(debugLogs, charData.skills[4].name, "피격 성공");
        }
    }
  },

  "rutenix": {
    customControls: [
      { id: "is_pos_5", type: "toggle", label: "포지션 5 위치", initial: false },
      { id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 }
    ],
    onTurn: (context) => {
        const { t, simState, debugLogs } = context;
        simHelpers.updateTimers(simState, ['ult_fixed_timer']);
        if (!simState.p2_timers) simState.p2_timers = [];
        if (!simState.p3_timers) simState.p3_timers = [];
        if (!simState.p5_timers) simState.p5_timers = [];
        simState.p2_timers = simState.p2_timers.map(v => v - 1).filter(v => v > 0);
        simState.p3_timers = simState.p3_timers.map(v => v - 1).filter(v => v > 0);
        simState.p5_timers = simState.p5_timers.map(v => v - 1).filter(v => v > 0);
        if (t % 4 !== 0) {
            for (let i = 0; i < 4; i++) { if (Math.random() < 0.5) { simState.p5_timers.push(3); simHelpers.addLog(debugLogs, "분해 분석", "성공"); } }
        }
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, customValues, passiveStats, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "기초공증": 0, "공증": 0, "고정공증": 0, extraHits: [] };
        const s4 = charData.skills[3], s5 = charData.skills[4], s7 = charData.skills[6];
        bonuses["기초공증"] += (simState.p2_timers || []).length * simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[1].max);
        bonuses["기초공증"] += (simState.p3_timers || []).length * simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.calc[0].max);
        bonuses["기초공증"] += (simState.p5_timers || []).length * simHelpers.getSkillVal(s7, stats.skills?.s7 || 1, s7.calc[0].max);
        if (customValues.is_pos_5 && simState.ult_fixed_timer > 0) {
            const s2 = charData.skills[1]; const s2Rate = getSkillMultiplier(stats.skills?.s2 || 1, 0.6);
            const lvVal = parseInt(stats.lv || 1), brVal = parseInt(stats.s1 || 0), fitVal = parseInt(stats.s2 || 0);
            const pureBase = charData.base["공격력"] * Math.pow(1.05, (lvVal - 1));
            const fitBase = Math.floor(pureBase * (1 + brVal * 0.02) * (1 + fitVal * 0.04));
            const baseMax = stats.stamp ? s2.ratioEffects.고정공증.stampMax : s2.ratioEffects.고정공증.max;
            bonuses["고정공증"] += Math.floor(fitBase * (1 + (passiveStats["기초공증"] + bonuses["기초공증"]) / 100) * (baseMax * s2Rate / 100));
            simHelpers.addLog(debugLogs, "앵커 혼란", "적용");
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, customValues, charData, debugLogs } = context;
        if (isUlt && customValues.is_pos_5) simState.ult_fixed_timer = 2;
        else if (!isDefend && Math.random() < 0.5) { simState.p2_timers.push(3); simHelpers.addLog(debugLogs, charData.skills[3].name, "성공"); }
        if (Math.random() < (customValues.normal_hit_prob / 100)) { simState.p3_timers.push(3); simHelpers.addLog(debugLogs, charData.skills[4].name, "피격 성공"); }
    }
  },

  "duncan": {
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['ult_atk_timer', 'p2_fixed_timer', 'p2_prob_timer', 'p3_extra_timer']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, isDefend, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "공증": 0, extraHits: [] };
        const s4 = charData.skills[3];
        if (isUlt || simState.ult_atk_timer > 0) bonuses["공증"] += simHelpers.getSkillVal(charData.skills[1], stats.skills?.s2 || 1, charData.skills[1].buffEffects.공증.max);
        if (simState.p2_fixed_timer > 0) bonuses["공증"] += simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[0].max);
        if (simState.p2_prob_timer > 0) bonuses["공증"] += simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[1].max);
        if (!isDefend && simState.magic_focus >= 2) { bonuses["뎀증"] += charData.skills[7].calc[0].max; simState.consume_focus = true; simHelpers.addLog(debugLogs, "마도 집중", "폭발"); }
        if (!isUlt && !isDefend && simState.p3_extra_timer > 0) {
            const s5 = charData.skills[4]; bonuses.extraHits.push({ coef: s5.damageDeal[0].val.max * getSkillMultiplier(stats.skills?.s5 || 1, s5.startRate), type: "보통공격", isMulti: false, skillId: "duncan_skill5", name: s5.name });
            simHelpers.addLog(debugLogs, s5.name, "발동");
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, stats, debugLogs } = context;
        if (isUlt) { simState.ult_atk_timer = 1; if (stats.stamp) { simState.magic_focus = Math.min(2, (simState.magic_focus || 0) + 1); simHelpers.addLog(debugLogs, "마도 집중", "충전"); } }
        else if (!isDefend) { simState.p2_fixed_timer = 2; if (Math.random() < 0.5) simState.p2_prob_timer = 2; }
        else { simState.p3_extra_timer = 2; }
        if (!isDefend && simState.consume_focus) { simState.magic_focus = 0; simState.consume_focus = false; }
    }
  },

  "goldenryder": {
    customControls: [{ id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 }],
    onTurn: (context) => {
        const { t, simState } = context;
        if (t === 1) simState.stride_timers = [2, 2, 2, 2, 2, 2];
        else if (simState.stride_timers) simState.stride_timers = simState.stride_timers.map(v => v - 1).filter(v => v > 0);
        simHelpers.updateTimers(simState, ['ult_buff_timer', 'p5_extra_timer', 'p3_dmg_timer']);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, isDefend, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        bonuses["평타뎀증"] += ((simState.stride_timers || []).length * simHelpers.getSkillVal(charData.skills[3], stats.skills?.s4 || 1, charData.skills[3].calc[0].max));
        if (simState.p3_dmg_timer > 0) bonuses["뎀증"] += simHelpers.getSkillVal(charData.skills[4], stats.skills?.s5 || 1, charData.skills[4].buffEffects.뎀증.max);
        if (isUlt) bonuses.skipMainDamage = true;
        else if (!isDefend) {
            if (simState.ult_buff_timer > 0) {
                const s2 = charData.skills[1], s2Rate = getSkillMultiplier(stats.skills?.s2 || 1, s2.startRate || 0.6);
                bonuses["평타뎀증"] += s2.stampBuffEffects.평타뎀증.max;
                bonuses.extraHits.push({ coef: (stats.stamp ? s2.damageDeal[0].val.stampMax : s2.damageDeal[0].val.max) * s2Rate, skillId: "goldenryder_skill2", name: s2.name });
            }
            if (simState.p5_extra_timer > 0) bonuses.extraHits.push({ coef: charData.skills[6].damageDeal[0].val.max * getSkillMultiplier(stats.skills?.s7 || 1, 0.6), skillId: "goldenryder_skill7", name: charData.skills[6].name });
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, customValues, debugLogs, charData } = context;
        if (isUlt) { simState.ult_buff_timer = 3; simState.p5_extra_timer = 3; }
        else if (!isDefend && Math.random() < 0.33) { simState.stride_timers.push(2); simHelpers.addLog(debugLogs, "열화질보", "추가"); }
        if (Math.random() < (customValues.normal_hit_prob / 100)) {
            simState.stride_timers.push(2); simState.p3_dmg_timer = 3; simHelpers.addLog(debugLogs, "열화질보", "성공");
        }
    }
  },

  "rikano": {
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['p1_debuff_timer', 'p2_debuff_timer', 'p4_debuff_timer']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, passiveStats, debugLogs } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, extraHits: [] };
        const s1 = charData.skills[0], s2 = charData.skills[1], s4 = charData.skills[3], s5 = charData.skills[4];
        const s1Val = simHelpers.getSkillVal(s1, stats.skills?.s1 || 1, s1.calc[0].max), s2Val = simHelpers.getSkillVal(s2, stats.skills?.s2 || 1, stats.stamp ? s2.calc[0].stampMax : s2.calc[0].max);
        const s4Eff = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[0].max), s4Debuff = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[1].max);
        if (passiveStats?.["필살기뎀증"] === 0) bonuses["필살기뎀증"] += s4Eff;
        let debuffSum = (simState.p1_debuff_timer > 0 ? s1Val : 0) + (simState.p2_debuff_timer > 0 ? s2Val : 0) + (simState.p4_debuff_timer > 0 ? s4Debuff : 0);
        if (isUlt) { if (!(simState.p2_debuff_timer > 0)) debuffSum += s2Val; } else { if (!(simState.p1_debuff_timer > 0)) debuffSum += s1Val; }
        bonuses["뎀증디버프"] = debuffSum;
        if (isUlt) {
            let totalForS5 = 100 + (passiveStats?.["뎀증디버프"] || 0) + debuffSum; if (!(simState.p4_debuff_timer > 0)) totalForS5 += s4Debuff;
            bonuses.extraHits.push({ coef: simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, s5.damageDeal[0].val.max) * (totalForS5 / (100 + (passiveStats?.["뎀증디버프"] || 0) + debuffSum)), type: "필살공격", skillId: "rikano_skill5", name: s5.name });
            simHelpers.addLog(debugLogs, s5.name, "발동");
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, simState, isDefend, charData, debugLogs } = context;
        if (!isDefend) {
            if (isUlt) { simState.p2_debuff_timer = 2; simState.p4_debuff_timer = 1; simHelpers.addLog(debugLogs, charData.skills[1].name, "성공"); }
            else { simState.p1_debuff_timer = 2; simHelpers.addLog(debugLogs, charData.skills[0].name, "성공"); }
        }
    }
  },
  "beernox": {}, "kyrian": {}, "meng": {}, "orem": {}, "leo": {}, "famido": {}
};