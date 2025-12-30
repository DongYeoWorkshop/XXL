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
        return baseVal * getSkillMultiplier(level, skill.startRate || 0.6);
    }
};

export const simCharData = {
  "tayangsuyi": {
    customControls: [
      { id: "ally_warrior_debuffer_count", type: "counter", label: "아군 전사/방해 수", min: 0, max: 4, initial: 0 },
      { id: "ally_ult_count", type: "counter", label: "선행 필살 수", min: 0, max: 3, initial: 0 }
    ],
    onTurn: (context) => {
        const { t, charData, stats, simState, customValues } = context;
        simHelpers.updateTimers(simState, ['afterDefendBonus']);
        const allyCount = customValues.ally_warrior_debuffer_count || 0;
        const skill4 = charData.skills[3];
        const s4Lv = stats.skills?.s4 || 1;
        if (t % 4 !== 0 && allyCount > 0) {
            const prob = simHelpers.getSkillVal(skill4, s4Lv, skill4.calc[0].max) / 100;
            for (let i = 0; i < allyCount; i++) { if (Math.random() < prob) simState.battleSpirit = Math.min(9, (simState.battleSpirit || 0) + 1); }
        }
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, customValues, charData, t } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const stacks = simState.battleSpirit || 0;
        if (stacks === 9 && (stats.stamp || false)) bonuses["뎀증"] += 20;
        if (!isUlt && simState.afterDefendBonus > 0) bonuses["평타뎀증"] += simHelpers.getSkillVal(charData.skills[4], stats.skills?.s5 || 1, charData.skills[4].calc[0].max);
        if (isUlt) {
            let ultBonus = stacks * 6;
            if (t > 1 && (t - 1) % 3 === 0) ultBonus += ((customValues.ally_ult_count || 0) * 15);
            bonuses["필살기뎀증"] = ultBonus;
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, stats, simState } = context;
        if (isDefend) simState.afterDefendBonus = 2;
        if (isUlt && !(stats.stamp || false)) simState.battleSpirit = 0;
    }
  },

  "choiyuhyun": {
    customControls: [{ id: "hp_full_rate", type: "input", label: "HP 100% 유지율(%)", min: 0, max: 100, initial: 100 }],
    onTurn: (context) => {},
    onCalculateDamage: (context) => {
        const { isUlt, charData, stats, simState, customValues, targetCount } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        if (Math.random() * 100 < (customValues.hp_full_rate || 0)) bonuses["뎀증"] += 25;
        if (isUlt && stats.stamp && targetCount >= 5) bonuses["뎀증"] += 20;
        if (simState.choi_passive3_ready) { bonuses.extraHits.push({ coef: 100, isMulti: false, skillId: "choiyuhyun_skill5" }); simState.choi_passive3_ready = false; }
        if (isUlt) {
            const s7 = charData.skills[6]; const rate = getSkillMultiplier(stats.skills?.s7 || 1, s7.startRate || 0.6);
            if (targetCount >= 5) bonuses.extraHits.push({ coef: 37.5 * rate, isMulti: true, skillId: "choiyuhyun_skill7" });
            else if (targetCount === 1) bonuses.extraHits.push({ coef: 75 * rate, isMulti: false, skillId: "choiyuhyun_skill7" });
        }
        return bonuses;
    },
    onAfterAction: (context) => { simState.choi_passive3_ready = context.isDefend; }
  },

  "kumoyama": {
    customControls: [
      { id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 },
      { id: "ult_hit_count", type: "counter", label: "필살 턴 피격 횟수", min: 0, max: 5, initial: 3 }
    ],
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['p2_timer', 'p3_timer']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, customValues, charData } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const p2_v = simHelpers.getSkillVal(charData.skills[3], stats.skills?.s4 || 1, 16);
        const p3_v = simHelpers.getSkillVal(charData.skills[4], stats.skills?.s5 || 1, 16);
        const p5_v = simHelpers.getSkillVal(charData.skills[6], stats.skills?.s7 || 1, 40);
        if (simState.p2_timer > 0) bonuses["뎀증"] += p2_v;
        if (simState.p3_timer > 0) bonuses["뎀증"] += p3_v;
        if (isUlt) {
            bonuses["뎀증"] += p5_v;
            if (simHelpers.rollActionBuff(simState, 'p2_timer', 0.5)) { if (!(simState.p2_timer > 0)) bonuses["뎀증"] += p2_v; }
            const hits = customValues.ult_hit_count || 0;
            const s2Rate = getSkillMultiplier(stats.skills?.s2 || 1, charData.skills[1].startRate || 0.6);
            for (let i = 0; i < hits; i++) {
                if (simHelpers.rollHitBuff(simState, 'p3_timer', 0.5)) { if (bonuses["뎀증"] < (p2_v + p3_v + p5_v)) bonuses["뎀증"] += p3_v; }
                bonuses.extraHits.push({ coef: 60 * s2Rate, isMulti: stats.stamp, skillId: "kumoyama_skill2" });
            }
            bonuses.skipMainDamage = true;
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        if (!context.isUlt && !context.isDefend) {
            simHelpers.rollActionBuff(context.simState, 'p2_timer', 0.5);
            const hitProb = (context.customValues.normal_hit_prob || 0) / 100;
            simHelpers.rollHitBuff(context.simState, 'p3_timer', hitProb * 0.5); 
        }
    }
  },

  "khafka": {
    customControls: [{ id: "is_paralysis_immune", type: "toggle", label: "대상 마비 면역", initial: false }],
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['p2_timer', 'p3_timer']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, customValues, charData } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, extraHits: [] };
        if (simState.p2_timer > 0) bonuses["뎀증디버프"] += 16;
        if (simState.p3_timer > 0) bonuses["뎀증디버프"] += 16;
        const isImmune = (customValues.is_paralysis_immune === true || customValues.is_paralysis_immune === 'true');
        if (isUlt && isImmune) bonuses["필살기뎀증"] += (33.75 * getSkillMultiplier(stats.skills?.s4 || 1, 0.6));
        return bonuses;
    },
    onAfterAction: (context) => {
        if (context.isDefend) simHelpers.rollActionBuff(context.simState, 'p3_timer', 1.0, 2);
        else simHelpers.rollActionBuff(context.simState, 'p2_timer', 0.5, 2);
    }
  },

  "baade": {
    customControls: [],
    onTurn: (context) => { simHelpers.updateTimers(context.simState, ['p5_timer']); },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        if (simState.scar_active) {
            bonuses["필살기뎀증"] += simHelpers.getSkillVal(charData.skills[3], stats.skills?.s4 || 1, 45);
            bonuses["평타뎀증"] += simHelpers.getSkillVal(charData.skills[4], stats.skills?.s5 || 1, 60);
        }
        if (simState.p5_timer > 0) bonuses["필살기뎀증"] += simHelpers.getSkillVal(charData.skills[6], stats.skills?.s7 || 1, 45);
        if (isUlt) {
            if (simState.scar_active && stats.stamp) {
                const rate = getSkillMultiplier(stats.skills?.s2 || 1, charData.skills[1].startRate || 0.6);
                bonuses.extraHits.push({ coef: 174.75 * rate, skillId: "baade_stamp_passive" });
            }
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        if (context.isUlt) context.simState.scar_active = !context.simState.scar_active;
        else if (!context.isDefend && context.simState.scar_active) context.simState.p5_timer = 2;
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
        const { isUlt, stats, simState, charData } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const hp = simState.current_hp;
        if (hp < 75) bonuses["뎀증"] += 15;
        if (hp < 50) bonuses["뎀증"] += 15;
        if (hp < 25) bonuses["뎀증"] += 15;
        bonuses["뎀증"] += ((simState.p3_timers || []).length * 5);
        if (isUlt) {
            const markCount = (simState.mark_timers || []).length;
            if (stats.stamp && markCount >= 2) bonuses["필살기뎀증"] += simHelpers.getSkillVal(charData.skills[7], stats.skills?.s2 || 1, 33.75);
            if (markCount >= 2 || hp < 25) {
                const sRate = getSkillMultiplier(stats.skills?.s7 || 1, 0.6);
                bonuses.extraHits.push({ coef: 100 * sRate, skillId: "locke_skill7" });
            }
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, customValues } = context;
        if (!isUlt && !isDefend && simState.current_hp >= 50) {
            if (!simState.mark_timers) simState.mark_timers = [];
            simState.mark_timers.push(3);
        }
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb && Math.random() < 0.5) {
            if (!simState.p3_timers) simState.p3_timers = [];
            if (simState.p3_timers.length < 3) simState.p3_timers.push(3); else simState.p3_timers[0] = 3;
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
        const { isUlt, stats, simState, charData } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        if (isUlt || (simState.p5_dr_timer > 0)) bonuses["뎀증"] += simHelpers.getSkillVal(charData.skills[6], stats.skills?.s7 || 1, 30);
        if ((simState.pressure_timers || []).length >= 3) bonuses.extraHits.push({ coef: simHelpers.getSkillVal(charData.skills[4], stats.skills?.s5 || 1, 75), isMulti: true, skillId: "tyrantino_skill5" });
        if (isUlt && (simState.rage_count || 0) >= 3) bonuses.extraHits.push({ coef: simHelpers.getSkillVal(charData.skills[3], stats.skills?.s4 || 1, 187.5), isMulti: true, skillId: "tyrantino_skill4" });
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, simState, stats, customValues } = context;
        if (isUlt) {
            simState.p5_dr_timer = 2;
            if (stats.stamp) { for(let i=0; i<3; i++) { if(!simState.pressure_timers) simState.pressure_timers = []; simState.pressure_timers.push(2); } }
            simState.rage_count = 0;
        }
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb) {
            simState.rage_count = Math.min(3, (simState.rage_count || 0) + 1);
            if (stats.stamp) { if(!simState.pressure_timers) simState.pressure_timers = []; simState.pressure_timers.push(3); }
        }
    }
  },

  "anuberus": {
    customControls: [],
    onTurn: (context) => {
        const { simState } = context;
        simHelpers.updateTimers(simState, ['black_dog_timer', 'white_dog_timer']);
        if (!simState.attr_debuff_timers) simState.attr_debuff_timers = [];
        if (!simState.hellhound_timers) simState.hellhound_timers = [];
        simState.attr_debuff_timers = simState.attr_debuff_timers.map(v => v - 1).filter(v => v > 0);
        simState.hellhound_timers = simState.hellhound_timers.map(v => v - 1).filter(v => v > 0);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "속성디버프": 0, extraHits: [] };
        bonuses["속성디버프"] += ((simState.attr_debuff_timers || []).length * 7.5);
        if (stats.stamp) {
            if (simState.black_dog_timer > 0) bonuses.extraHits.push({ coef: 30, skillId: "anuberus_stamp_passive" });
            if (simState.white_dog_timer > 0) bonuses.extraHits.push({ coef: 30, skillId: "anuberus_stamp_passive" });
        }
        if (isUlt) {
            const s7Lv = stats.skills?.s7 || 1; const p5_val = simHelpers.getSkillVal(charData.skills[6], s7Lv, 27);
            if (simState.black_dog_timer > 0) bonuses["필살기뎀증"] += p5_val;
            if (simState.white_dog_timer > 0) bonuses["필살기뎀증"] += p5_val;
            const houndCount = (simState.hellhound_timers || []).length;
            const s5Lv = stats.skills?.s5 || 1; const hound_coef = simHelpers.getSkillVal(charData.skills[4], s5Lv, 50);
            for (let i = 0; i < houndCount; i++) bonuses.extraHits.push({ coef: hound_coef, skillId: "anuberus_skill5" });
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        if (!context.isDefend) {
            const awakeCount = (context.simState.black_dog_timer > 0 ? 1 : 0) + (context.simState.white_dog_timer > 0 ? 1 : 0);
            for (let i = 0; i < awakeCount; i++) {
                if (!context.simState.attr_debuff_timers) context.simState.attr_debuff_timers = [];
                if (!context.simState.hellhound_timers) context.simState.hellhound_timers = [];
                if (context.simState.attr_debuff_timers.length < 4) context.simState.attr_debuff_timers.push(3); else context.simState.attr_debuff_timers[0] = 3;
                if (context.simState.hellhound_timers.length < 4) context.simState.hellhound_timers.push(3); else context.simState.hellhound_timers[0] = 3;
            }
        }
        simHelpers.rollActionBuff(context.simState, 'black_dog_timer', 0.5, 2);
        simHelpers.rollActionBuff(context.simState, 'white_dog_timer', 0.5, 2);
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
        const { isUlt, stats, simState, charData, customValues } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const addAtkStack = () => { simState.atk_stacks = Math.min(10, (simState.atk_stacks || 0) + 1); bonuses["공증"] = (simState.atk_stacks || 0) * 3; };
        bonuses["공증"] = (simState.atk_stacks || 0) * 3;
        bonuses["뎀증"] += ((simState.p3_timers || []).length * 25);
        addAtkStack();
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb) {
            const s5Lv = stats.skills?.s5 || 1;
            bonuses.extraHits.push({ coef: 100 * getSkillMultiplier(s5Lv, 0.6), skillId: "shinrirang_skill5" });
            addAtkStack();
            if (simState.p3_timers.length < 2) simState.p3_timers.push(3); else simState.p3_timers[0] = 3;
        }
        if (isUlt) {
            const s4Lv = stats.skills?.s4 || 1; const s8Lv = stats.skills?.s2 || 1;
            if (Math.random() < 0.5) bonuses["트리거뎀증"] += simHelpers.getSkillVal(charData.skills[3], s4Lv, 60);
            if (Math.random() < 0.5) { bonuses.extraHits.push({ coef: simHelpers.getSkillVal(charData.skills[3], s4Lv, 80), skillId: "shinrirang_skill4" }); addAtkStack(); }
            if (stats.stamp) {
                if (Math.random() < 0.5) bonuses["트리거뎀증"] += simHelpers.getSkillVal(charData.skills[7], s8Lv, 30);
                if (Math.random() < 0.5) { bonuses.extraHits.push({ coef: simHelpers.getSkillVal(charData.skills[7], s8Lv, 40), skillId: "shinrirang_skill8" }); addAtkStack(); }
            }
        }
        return bonuses;
    },
    onAfterAction: (context) => {}
  },

  "jetblack": {
    customControls: [],
    onTurn: (context) => {
        const { t, simState } = context;
        simHelpers.updateTimers(simState, ['p3_timer', 'ult_timer']);
        if (t % 4 !== 0) {
            for (let i = 0; i < 4; i++) { if (Math.random() < 0.33) simState.stamina_stacks = Math.min(6, (simState.stamina_stacks || 0) + 1); }
        }
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, isDefend } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        if (isUlt) simState.ult_timer = 3;
        if (simState.p3_timer > 0) bonuses["트리거뎀증"] += 24;
        if (simState.ult_timer > 0) bonuses["트리거뎀증"] += 30;
        const lvVal = parseInt(stats.lv || 1), brVal = parseInt(stats.s1 || 0), fitVal = parseInt(stats.s2 || 0);
        const fitBase = Math.floor(charData.base["공격력"] * Math.pow(1.05, (lvVal - 1)) * (1 + brVal * 0.02) * (1 + fitVal * 0.04));
        const finalBaseAtk = Math.floor(fitBase * 1.15);
        if (simState.ult_timer > 0) {
            const s2Lv = stats.skills?.s2 || 1; const rate = getSkillMultiplier(s2Lv, 0.6);
            bonuses["고정공증"] = (bonuses["고정공증"] || 0) + Math.floor(finalBaseAtk * (15 * rate / 100));
        }
        if (isUlt) {
            if ((simState.stamina_stacks || 0) >= 6) {
                const s4Lv = stats.skills?.s4 || 1;
                bonuses.extraHits.push({ coef: 200 * getSkillMultiplier(s4Lv, 0.6), skillId: "jetblack_skill4" });
                simState.consume_stamina = true;
            }
        } else if (!isDefend) {
            const s1Lv = stats.skills?.s1 || 1; const s1Rate = getSkillMultiplier(s1Lv, 0.6);
            const skill1Bonus = Math.floor(finalBaseAtk * (30 * s1Rate / 100));
            bonuses["고정공증"] = (bonuses["고정공증"] || 0) + skill1Bonus;
            const s7Lv = stats.skills?.s7 || 1;
            bonuses.extraHits.push({ coef: 100 * getSkillMultiplier(s7Lv, 0.6), skillId: "jetblack_skill7" });
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState } = context;
        if (isUlt) { if (simState.consume_stamina) { simState.stamina_stacks = 0; simState.consume_stamina = false; } }
        else if (!isDefend) { simHelpers.rollActionBuff(simState, 'p3_timer', 0.5, 2); simState.stamina_stacks = Math.min(6, (simState.stamina_stacks || 0) + 1); }
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
        const { isUlt, stats, simState, charData } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const p4Count = (simState.p4_timers || []).length;
        bonuses["뎀증"] += (p4Count * 5);
        if (isUlt) bonuses.skipMainDamage = true;
        else if (simState.ult_buff_timer > 0) {
            const s2 = charData.skills[1]; const s2Rate = getSkillMultiplier(stats.skills?.s2 || 1, s2.startRate || 0.6);
            const extra_coef = 20 * s2Rate;
            bonuses.extraHits.push({ coef: extra_coef, skillId: "wang_skill2" });
            if (stats.stamp && Math.random() < 0.5) bonuses.extraHits.push({ coef: extra_coef, skillId: "wang_skill2" });
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, simState, customValues } = context;
        if (isUlt) simState.ult_buff_timer = 3;
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb) {
            if (!simState.p4_timers) simState.p4_timers = [];
            if (simState.p4_timers.length < 2) simState.p4_timers.push(3); else simState.p4_timers[0] = 3;
        }
    }
  },

  "beernox": {}, "kyrian": {}, "meng": {}, "orem": {}, "leo": {}, "rutenix": {}, "duncan": {}, "famido": {}, "goldenryder": {
    customControls: [
      { id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 }
    ],
    onTurn: (context) => {
        const { t, simState } = context;
        if (t === 1) simState.stride_timers = [2, 2, 2, 2, 2, 2];
        else {
            if (!simState.stride_timers) simState.stride_timers = [];
            simState.stride_timers = simState.stride_timers.map(v => v - 1).filter(v => v > 0);
        }
        simHelpers.updateTimers(simState, ['ult_buff_timer', 'p5_extra_timer', 'p3_dmg_timer']);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, isDefend } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, extraHits: [] };
        const strideCount = (simState.stride_timers || []).length;
        const s4Lv = stats.skills?.s4 || 1;
        bonuses["평타뎀증"] += (strideCount * simHelpers.getSkillVal(charData.skills[3], s4Lv, 10));
        if (simState.p3_dmg_timer > 0) {
            const s5Lv = stats.skills?.s5 || 1;
            bonuses["뎀증"] += simHelpers.getSkillVal(charData.skills[4], s5Lv, 20);
        }
        if (isUlt) { bonuses.skipMainDamage = true; } else if (!isDefend) {
            if (simState.ult_buff_timer > 0) {
                const s2Lv = stats.skills?.s2 || 1; const rate = getSkillMultiplier(s2Lv, charData.skills[1].startRate || 0.6);
                bonuses["평타뎀증"] += 50; 
                bonuses.extraHits.push({ coef: (stats.stamp ? 100 : 50) * rate, skillId: "goldenryder_skill2" });
            }
            if (simState.p5_extra_timer > 0) {
                const s7Lv = stats.skills?.s7 || 1;
                bonuses.extraHits.push({ coef: 50 * getSkillMultiplier(s7Lv, 0.6), skillId: "goldenryder_skill7" });
            }
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, customValues } = context;
        if (isUlt) { simState.ult_buff_timer = 3; simState.p5_extra_timer = 3; }
        else if (!isDefend) {
            if (Math.random() < 0.33) {
                if (!simState.stride_timers) simState.stride_timers = [];
                if (simState.stride_timers.length < 6) simState.stride_timers.push(2); else simState.stride_timers[0] = 2;
            }
        }
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb) {
            if (!simState.stride_timers) simState.stride_timers = [];
            if (simState.stride_timers.length < 6) simState.stride_timers.push(2); else simState.stride_timers[0] = 2;
            simState.p3_dmg_timer = 2;
        }
    }
  }
};