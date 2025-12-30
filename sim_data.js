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
            // [수정] 데이터 기반 동적 계수 적용 (스킬4: 화산섬 전투의 춤)
            const s4 = charData.skills[3]; 
            const stackBonus = s4.calc[1].fixed || 6; 
            let ultBonus = stacks * stackBonus;
            
            // 선행 필살 수에 따른 보너스 (스킬7: 전의의 궐기, max 15)
            const s7 = charData.skills[6];
            const s7Val = simHelpers.getSkillVal(s7, stats.skills?.s7 || 1, s7.calc[0].max);
            
            if (t > 1 && (t - 1) % 3 === 0) ultBonus += ((customValues.ally_ult_count || 0) * s7Val);
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
        // [수정] 데이터 기반 동적 계수 적용 (스킬4: 일죽별운, max 25)
        const s4 = charData.skills[3];
        const hpFullBonus = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[0].max);
        
        if (Math.random() * 100 < (customValues.hp_full_rate || 0)) bonuses["뎀증"] += hpFullBonus;
        if (isUlt && stats.stamp && targetCount >= 5) bonuses["뎀증"] += 20;
        if (simState.choi_passive3_ready) { 
            const s5 = charData.skills[4];
            bonuses.extraHits.push({ coef: 100, isMulti: false, skillId: "choiyuhyun_skill5", name: s5.name }); 
            simState.choi_passive3_ready = false; 
        }
        if (isUlt) {
            const s7 = charData.skills[6]; const rate = getSkillMultiplier(stats.skills?.s7 || 1, s7.startRate || 0.6);
            if (targetCount >= 5) bonuses.extraHits.push({ coef: 37.5 * rate, isMulti: true, skillId: "choiyuhyun_skill7", name: s7.name });
            else if (targetCount === 1) bonuses.extraHits.push({ coef: 75 * rate, isMulti: false, skillId: "choiyuhyun_skill7", name: s7.name });
        }
        return bonuses;
    },
    onAfterAction: (context) => { 
        const { simState, isDefend } = context;
        simState.choi_passive3_ready = isDefend; 
    }
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
                bonuses.extraHits.push({ coef: 60 * s2Rate, isMulti: stats.stamp, skillId: "kumoyama_skill2", name: charData.skills[1].name });
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
                bonuses.extraHits.push({ 
                    coef: 174.75 * rate, 
                    skillId: "baade_stamp_passive",
                    name: charData.skills[1].name
                });
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
                const s7 = charData.skills[6];
                const sRate = getSkillMultiplier(stats.skills?.s7 || 1, 0.6);
                bonuses.extraHits.push({ 
                    coef: 100 * sRate, 
                    skillId: "locke_skill7",
                    name: s7.name
                });
            }
        }
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, customValues } = context;
        if (!isUlt && !isDefend && simState.current_hp >= 50) {
            if (!simState.mark_timers) simState.mark_timers = [];
            simState.mark_timers.push(5); // 30 -> 5 복구
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
        if ((simState.pressure_timers || []).length >= 3) {
            const s5 = charData.skills[4];
            bonuses.extraHits.push({ coef: simHelpers.getSkillVal(s5, stats.skills?.s5 || 1, 75), isMulti: true, skillId: "tyrantino_skill5", name: s5.name });
        }
        if (isUlt && (simState.rage_count || 0) >= 3) {
            const s4 = charData.skills[3];
            bonuses.extraHits.push({ coef: simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, 187.5), isMulti: true, skillId: "tyrantino_skill4", name: s4.name });
        }
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
        
        // [수정] 데이터 기반 동적 계수 적용 (스킬4: 망자 관리부・풍기과, max 7.5)
        const s4 = charData.skills[3];
        const debuffVal = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[1].max);
        
        bonuses["속성디버프"] += ((simState.attr_debuff_timers || []).length * debuffVal);
        if (stats.stamp) {
            const ultName = charData.skills[1].name;
            if (simState.black_dog_timer > 0) bonuses.extraHits.push({ coef: 30, skillId: "anuberus_stamp_passive", name: ultName });
            if (simState.white_dog_timer > 0) bonuses.extraHits.push({ coef: 30, skillId: "anuberus_stamp_passive", name: ultName });
        }
        if (isUlt) {
            const s7Lv = stats.skills?.s7 || 1; const p5_val = simHelpers.getSkillVal(charData.skills[6], s7Lv, 27);
            if (simState.black_dog_timer > 0) bonuses["필살기뎀증"] += p5_val;
            if (simState.white_dog_timer > 0) bonuses["필살기뎀증"] += p5_val;
            const houndCount = (simState.hellhound_timers || []).length;
            const s5 = charData.skills[4]; // 유령의 심장 심판
            const s5Lv = stats.skills?.s5 || 1; const hound_coef = simHelpers.getSkillVal(s5, s5Lv, 50);
            for (let i = 0; i < houndCount; i++) bonuses.extraHits.push({ coef: hound_coef, skillId: "anuberus_skill5", name: s5.name });
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
            const s5 = charData.skills[4];
            const s5Lv = stats.skills?.s5 || 1;
            bonuses.extraHits.push({ coef: 100 * getSkillMultiplier(s5Lv, 0.6), skillId: "shinrirang_skill5", name: s5.name });
            addAtkStack();
            if (simState.p3_timers.length < 2) simState.p3_timers.push(3); else simState.p3_timers[0] = 3;
        }
        if (isUlt) {
            const s4Lv = stats.skills?.s4 || 1; const s8Lv = stats.skills?.s2 || 1;
            const s4 = charData.skills[3];
            if (Math.random() < 0.5) bonuses["트리거뎀증"] += simHelpers.getSkillVal(s4, s4Lv, 60);
            if (Math.random() < 0.5) { bonuses.extraHits.push({ coef: simHelpers.getSkillVal(s4, s4Lv, 80), skillId: "shinrirang_skill4", name: s4.name }); addAtkStack(); }
            if (stats.stamp) {
                if (Math.random() < 0.5) bonuses["트리거뎀증"] += simHelpers.getSkillVal(charData.skills[7], s8Lv, 30);
                if (Math.random() < 0.5) { bonuses.extraHits.push({ coef: simHelpers.getSkillVal(charData.skills[7], s8Lv, 40), skillId: "shinrirang_skill8", name: charData.skills[1].name }); addAtkStack(); }
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
                const s4 = charData.skills[3];
                const s4Lv = stats.skills?.s4 || 1;
                bonuses.extraHits.push({ coef: 200 * getSkillMultiplier(s4Lv, 0.6), skillId: "jetblack_skill4", name: s4.name });
                simState.consume_stamina = true;
            }
        } else if (!isDefend) {
            const s1Lv = stats.skills?.s1 || 1; const s1Rate = getSkillMultiplier(s1Lv, 0.6);
            const skill1Bonus = Math.floor(finalBaseAtk * (30 * s1Rate / 100));
            bonuses["고정공증"] = (bonuses["고정공증"] || 0) + skill1Bonus;
            const s7 = charData.skills[6];
            const s7Lv = stats.skills?.s7 || 1;
            bonuses.extraHits.push({ coef: 100 * getSkillMultiplier(s7Lv, 0.6), skillId: "jetblack_skill7", name: s7.name });
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

  "beernox": {}, "kyrian": {}, "meng": {}, "orem": {}, "leo": {},  "rutenix": {
    customControls: [
      { id: "is_pos_5", type: "toggle", label: "포지션 5 위치", initial: false },
      { id: "normal_hit_prob", type: "input", label: "평상시 피격 확률(%)", min: 0, max: 100, initial: 30 }
    ],
    onTurn: (context) => {
        const { t, simState, customValues } = context;
        simHelpers.updateTimers(simState, ['ult_fixed_timer']);
        if (!simState.p2_timers) simState.p2_timers = [];
        if (!simState.p3_timers) simState.p3_timers = [];
        if (!simState.p5_timers) simState.p5_timers = [];
        simState.p2_timers = simState.p2_timers.map(v => v - 1).filter(v => v > 0);
        simState.p3_timers = simState.p3_timers.map(v => v - 1).filter(v => v > 0);
        simState.p5_timers = simState.p5_timers.map(v => v - 1).filter(v => v > 0);

        // 아군 보통공격 지원 (4인, 필살기 턴 제외)
        if (t % 4 !== 0) {
            for (let i = 0; i < 4; i++) {
                if (Math.random() < 0.5) {
                    if (simState.p5_timers.length < 4) simState.p5_timers.push(3); // 2턴 지속을 위해 3으로 설정
                    else simState.p5_timers[0] = 3;
                }
            }
        }
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, customValues, passiveStats } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "기초공증": 0, "공증": 0, "고정공증": 0, extraHits: [] };
        
        // 1. 스택형 기초공증 합산 (패시브 2, 3, 5)
        bonuses["기초공증"] += (simState.p2_timers || []).length * 15;
        bonuses["기초공증"] += (simState.p3_timers || []).length * 30;
        bonuses["기초공증"] += (simState.p5_timers || []).length * 12;

        // 2. 필살기 고정공증 (포지션 5일 때만)
        if (customValues.is_pos_5 && simState.ult_fixed_timer > 0) {
            const s2 = charData.skills[1];
            const s2Lv = stats.skills?.s2 || 1;
            const rate = getSkillMultiplier(s2Lv, s2.startRate || 0.6);
            const lvVal = parseInt(stats.lv || 1), brVal = parseInt(stats.s1 || 0), fitVal = parseInt(stats.s2 || 0);
            const pureBase = charData.base["공격력"] * Math.pow(1.05, (lvVal - 1));
            const fitBase = Math.floor(pureBase * (1 + brVal * 0.02) * (1 + fitVal * 0.04));
            
            // [수정] simulator.js에서 계산된 상시 패시브(passiveStats) 활용 (하드코딩 제거)
            const staticBaseAtkBonus = passiveStats ? (passiveStats["기초공증"] || 0) : 0;
            const currentFinalBase = Math.floor(fitBase * (1 + (staticBaseAtkBonus + bonuses["기초공증"]) / 100));
            const baseMax = stats.stamp ? 90 : 45;
            bonuses["고정공증"] += Math.floor(currentFinalBase * (baseMax * rate / 100));
        }

        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, customValues } = context;
        if (isUlt) {
            if (customValues.is_pos_5) simState.ult_fixed_timer = 2; // 행동 기준 2턴 (다음 턴에만 적용하려면 2가 맞음. T+1에 -1 되면 1 남음. 만약 2턴 지속이면 3이어야 함. 확인 필요)
            // 필살기는 "1턴 간 부여"이므로 다음 1턴만 유효하면 됨 -> push(2) -> 다음턴 시작시 1 -> 적용됨. 맞음.
        } else if (!isDefend) {
            // 패시브 2: 본인 보통공격 시 50% 확률 (3턴 지속, 본인 턴 포함 -> 실질 2턴)
            if (Math.random() < 0.5) {
                if (!simState.p2_timers) simState.p2_timers = [];
                if (simState.p2_timers.length < 2) simState.p2_timers.push(3); // 3턴(실질 2턴)을 위해 3으로 설정
                else simState.p2_timers[0] = 3;
            }
        }
        // 패시브 3: 피격 시 100% 확률 (2턴 지속, 피격 예외 -> 실질 2턴)
        const hitProb = (customValues.normal_hit_prob || 0) / 100;
        if (Math.random() < hitProb) {
            if (!simState.p3_timers) simState.p3_timers = [];
            if (simState.p3_timers.length < 1) simState.p3_timers.push(3); // 2턴(실질 2턴)을 위해 3으로 설정
            else simState.p3_timers[0] = 3;
        }
    }
  }, "duncan": {
    customControls: [],
    onTurn: (context) => {
        const { simState } = context;
        simHelpers.updateTimers(simState, ['ult_atk_timer', 'p2_fixed_timer', 'p2_prob_timer', 'p3_extra_timer']);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, isDefend } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "공증": 0, extraHits: [] };
        
        const s4 = charData.skills[3]; // 패시브 2
        const s4Lv = stats.skills?.s4 || 1;
        const p2_fixed_v = simHelpers.getSkillVal(s4, s4Lv, 16);
        const p2_prob_v = simHelpers.getSkillVal(s4, s4Lv, 32);

        // 1. 공격력 버프 합산
        if (isUlt || simState.ult_atk_timer > 0) {
            const s2 = charData.skills[1]; // 필살기
            const s2Lv = stats.skills?.s2 || 1;
            bonuses["공증"] += simHelpers.getSkillVal(s2, s2Lv, 30);
        }
        
        if (simState.p2_fixed_timer > 0) bonuses["공증"] += p2_fixed_v;
        if (simState.p2_prob_timer > 0) bonuses["공증"] += p2_prob_v;

        // 2. [마도 집중] 뎀증 150% (메인 + 추가타 전체)
        if (!isDefend && simState.magic_focus >= 2) {
            bonuses["뎀증"] += 150;
            simState.consume_focus = true;
        }

        if (!isUlt && !isDefend && simState.p3_extra_timer > 0) {
            const s5 = charData.skills[4]; // 패시브 3
            const s5Lv = stats.skills?.s5 || 1;
            bonuses.extraHits.push({ 
                coef: 120 * getSkillMultiplier(s5Lv, s5.startRate), 
                type: "보통공격", 
                isMulti: false, 
                skillId: "duncan_skill5" 
            });
        }
        bonuses.forceSingleTarget = true; 
        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, isDefend, simState, stats } = context;
        if (isUlt) {
            simState.ult_atk_timer = 1;
            if (stats.stamp) simState.magic_focus = Math.min(2, (simState.magic_focus || 0) + 1);
        } else if (!isDefend) {
            simState.p2_fixed_timer = 2;
            if (Math.random() < 0.5) simState.p2_prob_timer = 2;
        } else {
            simState.p3_extra_timer = 2;
        }
        if (!isDefend && simState.consume_focus) {
            simState.magic_focus = 0;
            simState.consume_focus = false;
        }
    }
  }, "famido": {}, "goldenryder": {
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
            simState.p3_dmg_timer = 3; // 2 -> 3 수정
        }
    }
  },
  "rikano": {
    customControls: [],
    onTurn: (context) => {
        const { simState } = context;
        simHelpers.updateTimers(simState, ['p1_debuff_timer', 'p2_debuff_timer', 'p4_debuff_timer']);
    },
    onCalculateDamage: (context) => {
        const { isUlt, stats, simState, charData, passiveStats } = context;
        const bonuses = { "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, extraHits: [] };
        
        const s1 = charData.skills[0];
        const s2 = charData.skills[1];
        const s4 = charData.skills[3];
        const s5 = charData.skills[4];

        const s1Val = simHelpers.getSkillVal(s1, stats.skills?.s1 || 1, s1.calc[0].max);
        const s2Val = simHelpers.getSkillVal(s2, stats.skills?.s2 || 1, stats.stamp ? s2.calc[0].stampMax : s2.calc[0].max);
        const s4Eff = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[0].max);
        const s4Debuff = simHelpers.getSkillVal(s4, stats.skills?.s4 || 1, s4.calc[1].max);

        // 1. 패시브 필살기 뎀증 (passiveStats에 이미 포함되어 있다면 더하지 않음)
        const staticUltBonus = passiveStats?.["필살기뎀증"] || 0;
        if (staticUltBonus === 0) bonuses["필살기뎀증"] += s4Eff;

        // 2. 디버프 합산 (상태 기반)
        let debuffSum = 0;
        
        // [핵심] 기존 상태(Timer)에 따른 합산
        if (simState.p1_debuff_timer > 0) debuffSum += s1Val;
        if (simState.p2_debuff_timer > 0) debuffSum += s2Val;
        if (simState.p4_debuff_timer > 0) debuffSum += s4Debuff;

        // [핵심] 선적용 로직 (중복 방지)
        if (isUlt) {
            // 필살기 턴인데 기존 타이머에 s2Val이 없다면(첫 발동 등) 수동 추가
            if (!(simState.p2_debuff_timer > 0)) debuffSum += s2Val;
        } else {
            // 보통공격 턴인데 기존 타이머에 s1Val이 없다면(첫 발동 등) 수동 추가
            if (!(simState.p1_debuff_timer > 0)) debuffSum += s1Val;
        }

        bonuses["뎀증디버프"] = debuffSum;

        // 3. 추가타 처리 (P5)
        if (isUlt) {
            const currentPassiveDebuff = (passiveStats?.["뎀증디버프"] || 0);
            // 추가타는 s4Debuff를 무조건 받아야 함 (기존 합계에 s4가 없다면 추가)
            let totalForS5 = 100 + currentPassiveDebuff + debuffSum;
            if (!(simState.p4_debuff_timer > 0)) totalForS5 += s4Debuff; 
            
            const s4Multiplier = totalForS5 / (100 + currentPassiveDebuff + debuffSum);

            const s5Lv = stats.skills?.s5 || 1;
            const s5BaseCoef = simHelpers.getSkillVal(s5, s5Lv, s5.damageDeal[0].val.max);
            
            bonuses.extraHits.push({ 
                coef: s5BaseCoef * s4Multiplier,
                type: "필살공격", 
                skillId: "rikano_skill5",
                name: s5.name
            });
        }

        return bonuses;
    },
    onAfterAction: (context) => {
        const { isUlt, simState, isDefend } = context;
        if (isDefend) return;

        if (isUlt) {
            simState.p2_debuff_timer = 2;
            simState.p4_debuff_timer = 1; // 1로 설정하여 추가타에만 적용되고 다음 턴 소멸
        } else {
            simState.p1_debuff_timer = 2;
        }
    }
  }
};