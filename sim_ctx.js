// simulator-ctx.js
import { getSkillMultiplier } from './formatter.js';
import { getStatusInfo } from './simulator-status.js';
import { simParams } from './sim_params.js';
import { SKILL_IDX, UNLOCK_REQ } from './simulator-common.js';

export function getSkillValue(charData, stats, skillIdx, effectKey, isStamp = false) {
    const skill = charData.skills[skillIdx];
    if (!skill) return 0;
    const isStampIcon = skill.icon && skill.icon.includes('images/sigilwebp/');
    const parentId = skill.syncLevelWith;
    let targetIdx = skillIdx;
    if (parentId) {
        const foundIdx = charData.skills.findIndex(s => s.id === parentId);
        if (foundIdx !== -1) targetIdx = foundIdx;
    }
    const br = parseInt(stats.s1 || 0);
    
    // [수정] 상수를 사용한 해금 조건 체크
    if (UNLOCK_REQ[skillIdx] && br < UNLOCK_REQ[skillIdx]) return 0;

    const skillLvMap = stats.skills || {};
    const lvS = parseInt(skillLvMap[`s${targetIdx+1}`] || 1) || 1;
    const rate = getSkillMultiplier(lvS, skill.startRate || 0.6) || 1;
    
    let e = null;
    // [수정] effectKey가 객체(직접 정의된 val)인 경우 바로 사용
    if (typeof effectKey === 'object' && effectKey !== null) {
        e = effectKey;
    }
    else if (typeof effectKey === 'number') {
        if (skill.calc && skill.calc[effectKey]) {
            const calcItem = skill.calc[effectKey];
            e = (typeof calcItem === 'object') ? (isStampIcon ? (calcItem.stampMax || calcItem.max) : calcItem.max) : calcItem;
        }
    } else {
        const effects = isStamp ? skill.stampBuffEffects : skill.buffEffects;
        if (effects && effects[effectKey] !== undefined) e = effects[effectKey];
        else if (skill.damageDeal) {
            const d = skill.damageDeal.find(dmg => dmg.type === effectKey);
            if (d) e = d.val;
        }
        if (e === null && effectKey === 'max' && skill.calc && skill.calc[0]) e = skill.calc[0];
        if (e === null && isStamp && skill.buffEffects && skill.buffEffects[effectKey] !== undefined) e = skill.buffEffects[effectKey];
    }
    if (e === null) return 0;
    const val = (typeof e === 'object' && e !== null) 
        ? (isStamp 
            ? (e.stampMax !== undefined ? e.stampMax : (e.stampFixed !== undefined ? e.stampFixed : (e.attributeMax || e.max || e.fixed || 0)))
            : ((e.targetAttribute !== undefined && charData.info.속성 === e.targetAttribute ? (e.attributeMax || e.max) : e.max) || e.fixed || 0)
          )
        : (e || 0);
    
    // [수정] 개별 startRate가 있는지 확인하여 배율(rate) 결정
    let finalRate = rate;
    if (typeof e === 'object' && e !== null) {
        const specificStartRate = isStamp ? (e.stampStartRate ?? e.startRate) : e.startRate;
        if (specificStartRate !== undefined) {
            finalRate = getSkillMultiplier(lvS, specificStartRate);
        }
    }

    return (Number(val) * finalRate) || 0;
}

export function createSimulationContext(baseData) {
    const { t, turns, charId, charData, stats, simState, isUlt, targetCount, isDefend, isAllyUltTurn, customValues, logs, debugLogs } = baseData;

    const ctx = {
        t, turns, charId, charData, stats, simState, isUlt, targetCount, isDefend, isAllyUltTurn, customValues, debugLogs,
        isHit: false, // 엔진에서 직접 수정 가능하도록 객체 속성으로 관리

        setTimer: (key, dur) => {
            simState[key] = ctx.isHit ? dur + 1 : dur;
        },

        addTimer: (key, dur, data = {}, maxStacks = Infinity) => {
            if (!simState[key]) simState[key] = [];
            const finalDur = ctx.isHit ? dur + 1 : dur;
            if (simState[key].length < maxStacks) {
                const item = (data && typeof data === 'object' && Object.keys(data).length > 0) ? { ...data, dur: finalDur } : finalDur;
                simState[key].push(item);
            } else {
                const oldest = simState[key][0];
                if (typeof oldest === 'object') oldest.dur = finalDur;
                else simState[key][0] = finalDur;
            }
        },

        getVal: (idx, key, stamp) => getSkillValue(charData, stats, idx, key, stamp || (isUlt && stats.stamp)),
        getSkillIdx: (skillId) => charData.skills.findIndex(s => s.id === skillId),

        isUnlocked: (idx) => {
            const br = parseInt(stats.s1 || 0);
            if (UNLOCK_REQ[idx] && br < UNLOCK_REQ[idx]) return false;
            return true;
        },

        log: (idx, res, chance, dur, skipPush = false, customTag = null) => {
            const br = parseInt(stats.s1 || 0);
            if (UNLOCK_REQ[idx] && br < UNLOCK_REQ[idx]) return "";

            let sName = "스킬", sIcon = "icon/main.png", label = "";
            if (typeof idx === 'number') {
                const s = charData.skills[idx];
                sName = s?.name || "알 수 없음"; sIcon = s?.icon || "icon/main.png";
                label = customTag || (idx === SKILL_IDX.ULT ? "필살기" : idx >= 7 ? "도장" : `패시브${idx-1}`);
            } else if (typeof idx === 'string') {
                const statusInfo = getStatusInfo(idx);
                if (statusInfo) { sName = statusInfo.name; sIcon = statusInfo.icon; label = customTag || ""; }
                else { sName = idx; if (sName === "피격") sIcon = "icon/simul.png"; else if (sName === "아군공격") sIcon = "icon/compe.png"; label = customTag || label; }
            }

            const actionMap = { "Buff": "버프 발동", "Trigger": "발동", "apply": "부여", "consume": "소모", "all_consume": "모두 소모", "gain": "획득", "activate": "발동" };
            let finalRes = actionMap[res] || res;
            let m = []; if (chance) m.push(`${chance}%`); if (dur) m.push(`${dur}턴`);
            const mS = m.length ? ` (${m.join(' / ')})` : "";
            const msg = `ICON:${sIcon}|${label ? '['+label+'] ' : ""}${sName}${finalRes ? ' '+finalRes : ""}${mS}`;
            debugLogs.push(msg);
            return msg;
        },

        applyBuff: (skillParam) => {
            const { prob, duration, label, originalId, maxStacks, customTag, skipTrigger, probSource, scaleProb, startRate } = skillParam;
            let finalProb = prob;
            if (probSource && customValues[probSource] !== undefined) finalProb = customValues[probSource] / 100;
            
            // [추가] 레벨 비례 확률 적용 (옵션이 켜져 있을 때만)
            if ((scaleProb || startRate !== undefined) && originalId) {
                const idx = ctx.getSkillIdx(originalId);
                if (idx !== -1) {
                    const skill = charData.skills[idx];
                    let targetIdx = idx;
                    if (skill.syncLevelWith) {
                        const parentIdx = charData.skills.findIndex(s => s.id === skill.syncLevelWith);
                        if (parentIdx !== -1) targetIdx = parentIdx;
                    }
                    const sLv = parseInt(stats.skills?.[`s${targetIdx+1}`] || 1);
                    const rate = getSkillMultiplier(sLv, startRate || skill.startRate || 0.6);
                    if (finalProb !== undefined) finalProb *= rate;
                }
            }

            if (finalProb === undefined || Math.random() < finalProb) {
                const timerKey = skillParam.timerKey || `${originalId?.split('_').pop()}_timer`;
                if (maxStacks && maxStacks > 1) ctx.addTimer(timerKey, duration, {}, maxStacks);
                else ctx.setTimer(timerKey, duration);
                if (originalId && !skipTrigger) ctx.checkStackTriggers(originalId);
                const displayProb = finalProb && finalProb < 1 ? finalProb * 100 : null;
                return ctx.log(ctx.getSkillIdx(originalId), label, displayProb, duration, false, customTag);
            }
            return "";
        },

        applyHit: (skillParam, val) => {
            const { prob, label, originalId, skipTrigger, customTag, scaleProb, startRate } = skillParam;
            
            // [추가] 레벨 비례 확률 적용
            let finalProb = prob;
            if ((scaleProb || startRate !== undefined) && originalId) {
                const idx = ctx.getSkillIdx(originalId);
                if (idx !== -1) {
                    const skill = charData.skills[idx];
                    let targetIdx = idx;
                    if (skill.syncLevelWith) {
                        const parentIdx = charData.skills.findIndex(s => s.id === skill.syncLevelWith);
                        if (parentIdx !== -1) targetIdx = parentIdx;
                    }
                    const sLv = parseInt(stats.skills?.[`s${targetIdx+1}`] || 1);
                    const rate = getSkillMultiplier(sLv, startRate || skill.startRate || 0.6);
                    if (finalProb !== undefined) finalProb *= rate;
                }
            }

            if (finalProb === undefined || Math.random() < finalProb) {
                return { val, chance: finalProb && finalProb < 1 ? finalProb * 100 : null, name: label, skillId: originalId, skipTrigger, customTag };
            }
            return null;
        },

        gainStack: (skillParam) => {
            const { maxStacks, label, originalId, customTag } = skillParam;
            // [수정] 자동 접미사 제거: id를 그대로 키로 사용
            const stateKey = skillParam.stateKey || skillParam.id;
            if (!stateKey) return "";
            simState[stateKey] = Math.min(maxStacks, (simState[stateKey] || 0) + 1);
            let skillIdx = originalId ? charData.skills.findIndex(s => s.id === originalId) : null;
            return ctx.log(skillIdx !== -1 ? skillIdx : null, label, null, null, false, customTag);
        },

        checkStackTriggers: (triggerId) => {
            const p = simParams[charId];
            if (!p || !triggerId) return;
            Object.values(p).forEach(param => {
                if (param.type === "stack" && param.triggers?.includes(triggerId)) {
                    // [추가] 확률 체크 로직 통합
                    let finalProb = param.prob;
                    if (finalProb !== undefined) {
                        if ((param.scaleProb || param.startRate !== undefined) && param.originalId) {
                            const idx = ctx.getSkillIdx(param.originalId);
                            if (idx !== -1) {
                                const skill = charData.skills[idx];
                                let targetIdx = idx;
                                if (skill.syncLevelWith) {
                                    const parentIdx = charData.skills.findIndex(s => s.id === skill.syncLevelWith);
                                    if (parentIdx !== -1) targetIdx = parentIdx;
                                }
                                const sLv = parseInt(stats.skills?.[`s${targetIdx+1}`] || 1);
                                const rate = getSkillMultiplier(sLv, param.startRate || skill.startRate || 0.6);
                                finalProb *= rate;
                            }
                        }
                        if (Math.random() >= finalProb) return; // 확률 실패 시 중단
                    }
                    ctx.gainStack(param);
                }
            });
        },

        checkBuffTriggers: (triggerId) => {
            const p = simParams[charId];
            if (!p || !triggerId) return;
            Object.values(p).forEach(param => {
                if (param.type === "buff" && param.triggers?.includes(triggerId)) {
                    // [추가] 확률 체크 로직 통합
                    let finalProb = param.prob;
                    if (finalProb !== undefined) {
                        if ((param.scaleProb || param.startRate !== undefined) && param.originalId) {
                            const idx = ctx.getSkillIdx(param.originalId);
                            if (idx !== -1) {
                                const skill = charData.skills[idx];
                                let targetIdx = idx;
                                if (skill.syncLevelWith) {
                                    const parentIdx = charData.skills.findIndex(s => s.id === skill.syncLevelWith);
                                    if (parentIdx !== -1) targetIdx = parentIdx;
                                }
                                const sLv = parseInt(stats.skills?.[`s${targetIdx+1}`] || 1);
                                const rate = getSkillMultiplier(sLv, param.startRate || skill.startRate || 0.6);
                                finalProb *= rate;
                            }
                        }
                        if (Math.random() >= finalProb) return;
                    }
                    ctx.applyBuff(param);
                }
            });
        },

        checkCondition: (cond) => {
            if (!cond) return true;
            if (Array.isArray(cond)) return cond.every(c => ctx.checkCondition(c));
            if (typeof cond === 'object') {
                if (cond.or) return cond.or.some(c => ctx.checkCondition(c));
                if (cond.and) return cond.and.every(c => ctx.checkCondition(c));
                return true;
            }
            if (typeof cond === 'string') {
                if (cond === "isUlt") return ctx.isUlt;
                if (cond === "isNormal") return !ctx.isUlt && !ctx.isDefend;
                if (cond === "isDefend") return ctx.isDefend;
                if (cond === "!isDefend") return !ctx.isDefend;
                if (cond === "isStamp") return stats.stamp;
                if (cond.startsWith("targetCount:")) {
                    const expr = cond.split(":")[1];
                    if (expr.startsWith(">=")) return targetCount >= parseInt(expr.substring(2));
                    if (expr.startsWith("<=")) return targetCount <= parseInt(expr.substring(2));
                    return targetCount === parseInt(expr);
                }
                if (cond.startsWith("hasBuff:")) {
                    const key = cond.split(":")[1] + "_timer";
                    return Array.isArray(simState[key]) ? simState[key].length > 0 : simState[key] > 0;
                }
                if (cond.startsWith("hasStack:")) {
                    const parts = cond.split(":");
                    const key = parts[1].endsWith("_stacks") ? parts[1] : parts[1] + "_stacks";
                    return (simState[key] || 0) >= (parts[2] ? parseInt(parts[2]) : 1);
                }
            }
            return false;
        },

        getWeightedVal: (skillParam, effectKey) => {
            const timerKey = skillParam.timerKey || `${skillParam.originalId?.split('_').pop()}_timer`;
            const isActive = Array.isArray(simState[timerKey]) ? simState[timerKey].length > 0 : simState[timerKey] > 0;
            if (!isActive) return 0;
            const baseVal = skillParam.testVal !== undefined ? skillParam.testVal : ctx.getVal(ctx.getSkillIdx(skillParam.originalId), effectKey);
            return baseVal * (skillParam.targetLimit ? (skillParam.targetLimit / targetCount) : 1);
        }
    };
    return ctx;
}