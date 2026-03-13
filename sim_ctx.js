// simulator-ctx.js
import { getSkillMultiplier } from './formatter.js';
import { getStatusInfo } from './simulator-status.js';
import { simParams } from './sim_params.js';
import { SKILL_IDX, UNLOCK_REQ, GRADE_UNLOCK_REQ } from './simulator-common.js';
import { formatDetailedLog } from './simulator-logger.js';

export function getSkillValue(charData, stats, skillIdx, effectKey, isStamp = false) {
    const skill = charData.skills[skillIdx];
    if (!skill) return 0;
    const isStampIcon = skill.icon && skill.icon.includes('images/sigilwebp/');
    // [수정] 도장 파생 스킬(isUltExtra)인 경우, 도장 보유 시 무조건 도장 계수 적용
    const forceStamp = skill.isUltExtra && stats.stamp;
    const parentId = skill.syncLevelWith;
    let targetIdx = skillIdx;
    if (parentId) {
        const foundIdx = charData.skills.findIndex(s => s.id === parentId);
        if (foundIdx !== -1) targetIdx = foundIdx;
    }
    const br = parseInt(stats.s1 || 0);
    
    // [수정] 해금 조건 체크 (ctx 대신 직접 판정)
    // 1. 등급별 특수 조건
    const gradeReq = GRADE_UNLOCK_REQ[charData.grade];
    if (gradeReq && gradeReq[skillIdx] !== undefined) {
        if (br < gradeReq[skillIdx]) return 0;
    }
    // 2. 일반 공통 조건
    const req = UNLOCK_REQ[skillIdx];
    if (req !== undefined && br < req) return 0;

    const skillLvMap = stats.skills || {};
    const lvS = parseInt(skillLvMap[`s${targetIdx+1}`] || 1) || 1;
    
    // [수정] 던컨처럼 calc[0]에 startRate가 있는 경우를 위해 탐색 순서 개선
    const baseStartRate = skill.startRate || skill.calc?.[0]?.startRate || 0.6;
    const rate = getSkillMultiplier(lvS, baseStartRate) || 1;
    
    let e = null;
    // [수정] effectKey가 객체(직접 정의된 val)인 경우 바로 사용
    if (typeof effectKey === 'object' && effectKey !== null) {
        e = effectKey;
    }
    else if (typeof effectKey === 'number') {
        if (skill.calc && skill.calc[effectKey]) {
            const calcItem = skill.calc[effectKey];
            // [추가] 고정 레벨 수치 배열이 있으면 우선 사용
            if (calcItem && calcItem.fixedLevels && Array.isArray(calcItem.fixedLevels)) {
                return calcItem.fixedLevels[lvS - 1] || 0;
            }
            // [수정] 아이콘 이름, isStamp 인자, 그리고 isUltExtra 여부를 모두 확인
            const useStampVal = isStamp || isStampIcon || forceStamp;
            
            if (typeof calcItem === 'object') {
                // [수정] fixed 또는 stampFixed가 있으면 우선 사용, 없으면 max/stampMax 사용
                if (useStampVal) {
                    e = (calcItem.stampFixed !== undefined) ? calcItem : (calcItem.stampMax !== undefined ? calcItem : (calcItem.fixed !== undefined ? calcItem : calcItem.max));
                } else {
                    e = (calcItem.fixed !== undefined) ? calcItem : calcItem.max;
                }
                // 만약 e가 여전히 undefined면 calcItem 자체를 반환
                if (e === undefined) e = calcItem;
            } else {
                e = calcItem;
            }
        }
    } else {
        const effects = (isStamp || forceStamp) ? (skill.stampBuffEffects || {}) : (skill.buffEffects || {});
        if (effects[effectKey] !== undefined) e = effects[effectKey];
        else if (skill.ratioEffects && skill.ratioEffects[effectKey] !== undefined) e = skill.ratioEffects[effectKey]; // [추가] ratioEffects 탐색
        else if (skill.damageDeal) {
            const d = skill.damageDeal.find(dmg => dmg.type === effectKey);
            if (d) e = d.val;
        }
        if (e === null && effectKey === 'max' && skill.calc && skill.calc[0]) e = skill.calc[0];
        if (e === null && (isStamp || forceStamp) && skill.buffEffects && skill.buffEffects[effectKey] !== undefined) e = skill.buffEffects[effectKey];
    }
    if (e === null) return 0;
    
    // [수정] 메인 계산기와 동일하게 엄격한 속성 체크 적용
    let val = 0;
    let isFixedVal = false;
    
    if (typeof e === 'object' && e !== null) {
        // [수정] forceStamp도 고려하여 도장 수치 적용
        if (isStamp || forceStamp) {
            if (e.stampFixed !== undefined) {
                val = e.stampFixed;
                isFixedVal = true;
            } else if (e.fixed !== undefined) {
                val = e.fixed;
                isFixedVal = true;
            } else {
                val = e.stampMax !== undefined ? e.stampMax : (e.max !== undefined ? e.max : (e.attributeMax || 0));
            }
        } else {
            if (e.fixed !== undefined) {
                val = e.fixed;
                isFixedVal = true;
            } else if (e.targetAttribute !== undefined) {
                if (charData.info.속성 === e.targetAttribute) {
                    val = e.attributeMax || e.max || 0;
                } else {
                    val = e.attributeMax !== undefined ? e.max : 0;
                }
            } else {
                val = e.max || 0;
            }
        }
    } else {
        val = e || 0;
    }
    
    // [수정] 고정 수치(fixed)가 아닐 때만 배율(rate) 결정 및 적용
    if (isFixedVal) return Number(val) || 0;

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
    const { t, turns, charId, charData, stats, baseStats, simState, isUlt, targetCount, isDefend, isAllyUltTurn, customValues, logs, debugLogs, extraPattern } = baseData;

    const ctx = {
        t, turns, charId, charData, stats, baseStats, simState, isUlt, targetCount, isDefend, isAllyUltTurn, customValues, logs, debugLogs, extraPattern,
        isHit: false, // 엔진에서 직접 수정 가능하도록 객체 속성으로 관리
        extraHits: [], // [추가] 추가타 목록 초기화

        setTimer: (key, dur) => {
            simState[key] = ctx.isHit ? dur + 1 : dur;
        },

        addTimer: (key, dur, data = {}, maxStacks = Infinity) => {
            if (!simState[key]) simState[key] = [];
            // [수정] applyBuff에서 이미 보정된 dur를 받으므로 여기서 중복 가산(+1) 제거
            const finalDur = dur; 
            
            if (simState[key].length < maxStacks) {
                const item = (data && typeof data === 'object' && Object.keys(data).length > 0) ? { ...data, dur: finalDur } : finalDur;
                simState[key].push(item);
            } else {
                // [개선] 가득 찼을 경우, 남은 시간이 가장 적은 스택을 찾아 갱신
                let minIdx = 0;
                let minVal = Infinity;
                
                simState[key].forEach((s, idx) => {
                    const currentDur = typeof s === 'object' ? s.dur : s;
                    if (currentDur < minVal) {
                        minVal = currentDur;
                        minIdx = idx;
                    }
                });

                if (typeof simState[key][minIdx] === 'object') {
                    simState[key][minIdx].dur = finalDur;
                    // 데이터가 새로 들어왔다면 덮어쓰기
                    if (data && typeof data === 'object') Object.assign(simState[key][minIdx], data);
                } else {
                    simState[key][minIdx] = finalDur;
                }
            }
        },

        getVal: (idx, key, stamp) => getSkillValue(charData, stats, idx, key, stamp || (isUlt && stats.stamp)),
        getSkillIdx: (skillId) => charData.skills.findIndex(s => s.id === skillId),

        isUnlocked: (idx) => {
            const br = parseInt(stats.s1 || 0);
            
            // [최유희/XL 전용] 패시브 2 (idx 3)는 15단계 이상이어야 해금
            if (charData.grade === 'XL' && idx === 3) {
                return br >= 15;
            }

            const req = UNLOCK_REQ[idx];
            // 다른 모든 캐릭터는 기존 공통 해금 기준을 따름
            if (req !== undefined && br < req) return false;
            return true;
        },

        log: (idx, res, chance, dur, skipPush = false, customTag = null) => {
            const msg = formatDetailedLog(ctx, idx, res, chance, dur, customTag);
            if (msg && !skipPush) debugLogs.push(msg);
            return msg;
        },

        applyBuff: (skillParam) => {
            const { prob, duration, durationSource, label, originalId, maxStacks, customTag, skipTrigger, probSource, scaleProb, startRate, valKey, showAtkBoost } = skillParam;
            let finalProb = prob;
            if (probSource && customValues[probSource] !== undefined) finalProb = customValues[probSource] / 100;
            
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
                
                // [수정] durationSource 로직 추가 (도장 여부에 따른 지속시간 변경)
                let finalDuration = duration;
                if (durationSource === "stamp:2" && ctx.stats.stamp) {
                    finalDuration = 2;
                }
                
                const logDuration = finalDuration; 
                
                if (ctx.isHit || skillParam.triggers?.includes("ally_hit") || skillParam.triggers?.includes("being_hit")) {
                    finalDuration += 1;
                }

                let data = {};
                let finalLabel = label;
                if (originalId) {
                    const idx = ctx.getSkillIdx(originalId);
                    if (idx !== -1) {
                        const rate = ctx.getVal(idx, valKey || 'max');
                        data.val = rate;
                        
                        if (showAtkBoost && ctx.baseStats) {
                            let currentBaseAtkRate = 100;
                            charData.skills.forEach((s, sIdx) => {
                                const hasBaseAtkEffect = (s.buffEffects && s.buffEffects["기초공증"]) || 
                                                         (s.stampBuffEffects && s.stampBuffEffects["기초공증"]);
                                if (hasBaseAtkEffect) {
                                    const tKey = s.id.split('_').pop() + "_timer";
                                    const sKey = s.id.split('_').pop() + "_stacks";
                                    const stateVal = simState[tKey] || simState[sKey] || simState[s.id + "_timer"] || simState[s.id + "_stacks"];
                                    if (stateVal) {
                                        let count = 0;
                                        if (Array.isArray(stateVal)) count = stateVal.length;
                                        else if (typeof stateVal === 'number' && stateVal > 0) {
                                            const isStackKey = (simState[sKey] !== undefined || (s.id + "_stacks") in simState || sKey.includes('stacks'));
                                            count = isStackKey ? stateVal : 1;
                                        }
                                        if (count > 0) {
                                            const sVal = ctx.getVal(sIdx, '기초공증');
                                            currentBaseAtkRate += (sVal * count);
                                        }
                                    }
                                }
                            });
                            const br = Number(stats.s1) || 0;
                            if (br >= 50 && charData.skills[5]?.buffEffects?.["기초공증"]) {
                                if (!(simState["skill6_timer"] || simState["rutenix_skill6_timer"])) {
                                    currentBaseAtkRate += ctx.getVal(5, '기초공증');
                                }
                            }
                            const currentBaseAtk = ctx.baseStats["공격력"] * (currentBaseAtkRate / 100);
                            const boostVal = Math.floor(currentBaseAtk * (rate / 100));
                            finalLabel += ` (+${boostVal.toLocaleString()} 가산)`;
                        }
                    }
                }

                if (maxStacks && maxStacks > 1) ctx.addTimer(timerKey, finalDuration, data, maxStacks);
                else ctx.setTimer(timerKey, finalDuration);
                
                if (originalId && !skipTrigger) ctx.checkStackTriggers(originalId);
                const displayProb = finalProb && finalProb < 1 ? finalProb * 100 : null;
                
                // 로그에는 보정 전(logDuration) 지속시간 표시
                const logDur = skillParam.skipDurLog ? null : logDuration;
                const logIdx = skillParam.icon ? { name: "", icon: skillParam.icon, label: "", originalIdx: ctx.getSkillIdx(originalId) } : ctx.getSkillIdx(originalId);
                
                return ctx.log(logIdx, finalLabel, displayProb, logDur, !!skillParam.skipLog, customTag);
            }
            return "";
        },

        // [v2 전용] 즉시 데미지 실행
        execHit: (event) => {
            const idx = ctx.getSkillIdx(event.originalId || event.skillId);
            const valKey = event.valKey !== undefined ? event.valKey : '추가공격';
            const val = event.val !== undefined ? event.val : (event.valIdx !== undefined ? ctx.getVal(idx, event.valIdx) : ctx.getVal(idx, valKey));
            
            // 엔진에서 주입해줄 프로세서(onExecHit) 호출
            if (ctx.onExecHit) {
                const hitInfo = { ...event, val };
                ctx.onExecHit(hitInfo);
            }
        },

        applyHit: (skillParam, val) => {
            const { prob, label, originalId, skipTrigger, customTag, scaleProb, startRate, icon, hitType } = skillParam;
            
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
                // 확률이 1(100%)보다 작을 때만 퍼센트 수치 부여, 아니면 null
                const chanceVal = (finalProb !== undefined && finalProb < 1) ? Math.floor(finalProb * 100) : null;
                // hitType이 있으면 그것을 type으로 반환 (계산기 연동용)
                return { val, chance: chanceVal, name: label, skillId: originalId, skipTrigger, customTag, icon, type: hitType };
            }
            return null;
        },

        gainStack: (skillParam, chance) => {
            const { maxStacks, label, originalId, customTag, val } = skillParam;
            // [수정] 자동 접미사 제거: id를 그대로 키로 사용
            const stateKey = skillParam.stateKey || skillParam.id;
            if (!stateKey) return "";
            
            const amount = val !== undefined ? val : 1;
            simState[stateKey] = Math.min(maxStacks, (simState[stateKey] || 0) + amount);
            
            // [수정] 파라미터 객체 전체를 전달하여 태그/아이콘 정보 보존
            return ctx.log(skillParam, label, chance, null, false, customTag);
        },

        checkStackTriggers: (triggerId) => {
            const p = simParams[charId];
            if (!p || !triggerId) return;
            Object.values(p).forEach(param => {
                if (param.type === "stack" && param.triggers?.includes(triggerId)) {
                    // [수정] 조건이 '있는' 경우에만 체크하도록 엄격히 제한
                    if (param.condition !== undefined && !ctx.checkCondition(param.condition)) return;
                    
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
                    // [수정] 최종 계산된 확률을 % 단위로 gainStack에 전달
                    const chanceVal = finalProb !== undefined && finalProb < 1 ? Math.floor(finalProb * 100) : null;
                    ctx.gainStack(param, chanceVal);
                }
            });
        },

        checkBuffTriggers: (triggerId) => {
            const p = simParams[charId];
            if (!p || !triggerId) return;
            Object.values(p).forEach(param => {
                if (param.type === "buff" && param.triggers?.includes(triggerId)) {
                    // [수정] 조건이 '있는' 경우에만 체크하도록 엄격히 제한
                    if (param.condition !== undefined && !ctx.checkCondition(param.condition)) return;

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
            const innerCheck = (c) => {
                if (!c) return true;
                // [추가] 함수형 조건 처리
                if (typeof c === 'function') return c(ctx);
                if (Array.isArray(c)) return c.every(item => innerCheck(item));
                if (typeof c === 'object') {
                    if (c.or) return c.or.some(item => innerCheck(item));
                    if (c.and) return c.and.every(item => innerCheck(item));
                    return true;
                }
                if (typeof c === 'string') {
                    if (c === "isUlt") return !!ctx.isUlt;
                    if (c === "!isUlt") return !ctx.isUlt;
                    if (c === "isNormal") return !ctx.isUlt && !ctx.isDefend;
                    if (c === "isDefend") return !!ctx.isDefend;
                    if (c === "!isDefend") return !ctx.isDefend;
                    if (c === "isStamp") return !!stats.stamp;
                    if (c === "enemy_hp_50") return (customValues?.enemy_hp_percent || 0) >= 50;
                    
                    // 커스텀 컨트롤 값 체크 (self_buff_mode 등)
                    if (customValues && customValues[c] !== undefined) return !!customValues[c];

                    if (c.startsWith("targetCount:")) {
                        const expr = c.split(":")[1];
                        if (expr.startsWith(">=")) return targetCount >= parseInt(expr.substring(2));
                        if (expr.startsWith("<=")) return targetCount <= parseInt(expr.substring(2));
                        return targetCount === parseInt(expr);
                    }
                    if (c.startsWith("hasBuff:")) {
                        let key = c.split(":")[1];
                        if (!key.endsWith("_timer") && !key.endsWith("_stacks")) {
                            key = key + "_timer";
                        }
                        return Array.isArray(simState[key]) ? simState[key].length > 0 : simState[key] > 0;
                    }
                    if (c.startsWith("hasStack:")) {
                        const parts = c.split(":");
                        let key = parts[1];
                        // 1. 입력된 키 그대로 먼저 찾아봄
                        let val = simState[key];
                        // 2. 없으면 _stacks를 붙여서 찾아봄
                        if (val === undefined && !key.endsWith("_stacks")) {
                            key = key + "_stacks";
                            val = simState[key];
                        }
                        const count = Array.isArray(val) ? val.length : (val || 0);
                        return count >= (parts[2] ? parseInt(parts[2]) : 1);
                    }
                }
                return false;
            };
            return innerCheck(cond);
        },

        getWeightedVal: (skillParam, effectKey) => {
            const timerKey = skillParam.timerKey || `${skillParam.originalId?.split('_').pop()}_timer`;
            const stateVal = simState[timerKey];
            if (!stateVal || (Array.isArray(stateVal) && stateVal.length === 0)) return 0;
            
            const stackCount = Array.isArray(stateVal) ? stateVal.length : 1;
            const baseVal = skillParam.testVal !== undefined ? skillParam.testVal : ctx.getVal(ctx.getSkillIdx(skillParam.originalId), effectKey);
            
            // [가중치 결정 로직]
            let limit = skillParam.targetLimit;
            if (limit === undefined) {
                if (effectKey === "뎀증디버프" || effectKey === "속성디버프") {
                    limit = 1;
                } else {
                    limit = targetCount; 
                }
            }

            // [핵심] 단일 공격(isMulti: false)이면 가중치를 무시하고 100% 적용 (점사 가정)
            // 광역 공격(isMulti: true)인 경우에만 1/N 가중치 적용
            const weight = ctx.isMulti ? (limit / targetCount) : 1;

            return (baseVal * stackCount) * weight;
        }
    };
    return ctx;
}