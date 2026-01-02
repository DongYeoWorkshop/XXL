// simulator-engine.js
import { calculateDamage, calculateBaseStats, assembleFinalStats } from './calculations.js';
import { getSkillMultiplier } from './formatter.js';
import { commonControls } from './simulator-common.js';
import { getStatusInfo, formatStatusMessage, formatStatusAction } from './simulator-status.js';
import { simParams } from './sim_params.js';

/**
 * 버프 상태 표시용 포매터
 */
export function formatBuffState(charId, state, charDataObj, sData, stats) {
    const entries = [];
    
    // [추가] 해당 캐릭터의 파라미터 가져오기
    const charParams = simParams[charId] || {};

    const getSkillInfo = (idx) => {
        const originalSkill = charDataObj.skills[idx];
        if (!originalSkill) return { label: "스킬", name: "알 수 없음", icon: "icon/main.png" };
        
        // 아이콘 경로에 'sigilwebp'가 포함되어 있는지 아주 확실하게 체크
        const isStampIcon = originalSkill.icon && (originalSkill.icon.indexOf('sigilwebp/') !== -1);

        let s = originalSkill;
        if (s.syncLevelWith) {
            const parentIdx = charDataObj.skills.findIndex(sk => sk.id === s.syncLevelWith);
            if (parentIdx !== -1) {
                s = charDataObj.skills[parentIdx];
            }
        }

        let label = "";
        if (isStampIcon) {
            label = "도장";
        } else {
            // 연동 여부와 상관없이 원래 인덱스(idx)를 우선 참조하여 라벨 결정
            // (보통공격:0, 필살기:1, 패시브:2~6)
            label = (idx === 1) ? "필살기" : (idx >= 2 && idx <= 6) ? `패시브${idx - 1}` : "스킬";
        }

        return { label, name: originalSkill.name, icon: originalSkill.icon || "icon/main.png" };
    };

    for (const [key, val] of Object.entries(state)) {
        if (!val || val === 0 || (Array.isArray(val) && val.length === 0)) continue;
        if (key.startsWith('has_')) continue;

        let name = "", icon = 'icon/main.png', displayDur = "";
        const customName = sData?.stateDisplay?.[key];
        
        // [추가] simParams에서 해당 키에 맞는 customTag 찾기 (id 혹은 stateKey 매칭)
        let foundCustomTag = null;
        const matchedParam = Object.values(charParams).find(p => p.stateKey === key || p.id === key || (p.id && `${p.id}_stacks` === key));
        if (matchedParam && matchedParam.customTag) {
            foundCustomTag = matchedParam.customTag;
        }

        const skillMatch = key.match(/^skill(\d+)/);
        
        // 1. 스킬 기반 버프 처리
        if (skillMatch) {
            const skillNum = parseInt(skillMatch[1]);
            const skillIdx = skillNum - 1;

            // [추가] 돌파 단계에 따른 상태 표시 차단 (stats 정보 활용)
            const br = parseInt(stats.s1 || 0);
            if (skillIdx === 4 && br < 30) continue;
            if (skillIdx === 5 && br < 50) continue;
            if (skillIdx === 6 && br < 75) continue;

            const info = getSkillInfo(skillIdx);
            // customTag가 있으면 최우선 적용
            name = foundCustomTag ? `[${foundCustomTag}]` : (customName || `[${info.label}]`);
            icon = info.icon;

            if (Array.isArray(val)) {
                const count = val.length;
                const maxTurn = (typeof val[0] === 'object') ? Math.max(...val.map(v => v.dur || 0)) : Math.max(...val);
                displayDur = `${maxTurn}턴 / ${count}중첩`;
            } else if (typeof val === 'number') {
                displayDur = key.includes('stack') ? `${val}중첩` : `${val}턴`;
            } else {
                displayDur = "ON";
            }
        } 
        // 2. 등록된 특수 상태이상(각흔, 전의 등) 처리
        else {
            const statusInfo = getStatusInfo(key);
            if (statusInfo) {
                name = statusInfo.name;
                icon = statusInfo.icon;
                const unit = statusInfo.unit || "턴";
                
                if (Array.isArray(val)) {
                    if (val.length === 0) continue;
                    const maxDur = Math.max(...val);
                    // 스킬 버프 템플릿과 동일하게 "턴 / 중첩" 순서로 통일
                    if (statusInfo.type === 'stack') {
                        displayDur = `${maxDur}턴 / ${val.length}중첩`;
                    } else {
                        displayDur = `${maxDur}턴`;
                    }
                } else {
                    displayDur = typeof val === 'number' ? `${val}${unit}` : "ON";
                }
            } else if (customName) {
                name = customName;
                displayDur = typeof val === 'number' ? (key.includes('stack') ? `${val}중첩` : `${val}턴`) : "ON";
            } else {
                continue;
            }
        }
        entries.push({ name, duration: displayDur, icon });
    }
    return entries;
}

/**
 * 시뮬레이션 핵심 엔진
 */
export function runSimulationCore(context) {
    const { charId, charData, sData, stats, turns, iterations, targetCount, manualPattern, enemyAttrIdx, defaultGrowthRate, hitProb } = context;
    const lv = parseInt(stats.lv || 1), br = parseInt(stats.s1 || 0), fit = parseInt(stats.s2 || 0);
    const baseStats = calculateBaseStats(charData.base, lv, br, fit, defaultGrowthRate);
    
    const getSkillValue = (skillIdx, effectKey, isStamp = false) => {
        const skill = charData.skills[skillIdx];
        if (!skill) return 0;

        // [규칙 적용] 도장 및 부속 스킬 판별
        const isStampIcon = skill.icon && skill.icon.includes('images/sigilwebp/');
        const parentId = skill.syncLevelWith;
        
        // 레벨 계산을 위한 대상 스킬 찾기 (도장이거나 syncLevelWith가 있으면 부모 스킬의 레벨을 따름)
        let targetIdx = skillIdx;
        if (parentId) {
            const foundIdx = charData.skills.findIndex(s => s.id === parentId);
            if (foundIdx !== -1) targetIdx = foundIdx;
        }

        // [추가] 돌파 단계에 따른 스킬 잠금 체크
        const br = parseInt(stats.s1 || 0);
        if (skillIdx === 4 && br < 30) return 0; // 패시브3
        if (skillIdx === 5 && br < 50) return 0; // 패시브4
        if (skillIdx === 6 && br < 75) return 0; // 패시브5

        const skillLvMap = stats.skills || {};
        const lvS = parseInt(skillLvMap[`s${targetIdx+1}`] || 1) || 1;
        const rate = getSkillMultiplier(lvS, skill.startRate || 0.6) || 1;
        
        let e = null;
        // effectKey가 숫자인 경우 calc 배열의 인덱스로 취급
        if (typeof effectKey === 'number') {
            if (skill.calc && skill.calc[effectKey]) {
                const calcItem = skill.calc[effectKey];
                // calc[n]이 객체 {max: 100} 형태면 max를, 숫자면 그 값을 취함
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
        
        const finalVal = Number(val) || 0;
        // [수정] 스킬 레벨에 따른 추가 배율(rate)을 곱하지 않고 원본 수치 그대로 반환합니다.
        return finalVal;
    };

    const iterationResults = [];
    // [명칭 통일] 엔진 내부 단계를 외부 훅 명칭과 일치시킵니다.
    const flow = sData.flow || ['onTurn', 'onCalculateDamage', 'onAttack', 'onEnemyHit', 'onAfterAction'];

    for (let i = 0; i < iterations; i++) {
        // [수정] initialState 깊은 복사로 초기화 (없으면 기본값 사용)
        let simState = sData.initialState ? JSON.parse(JSON.stringify(sData.initialState)) : {};
        // 기본값 보장
        if (simState.battleSpirit === undefined) simState.battleSpirit = 0;
        if (simState.atk_stacks === undefined) simState.atk_stacks = 0;

        let total = 0;
        const ultCD = (() => { const m = charData.skills[1].desc?.match(/\(쿨타임\s*:\s*(\d+)턴\)/); return m ? parseInt(m[1]) : 3; })();
        let cd = { ult: ultCD };
        const logs = [], perTurnDmg = [], stateLogs = [], detailedLogs = [], turnInfoLogs = [];

        const makeCtx = (tVal, isUltVal, logsArray, dLogsArray, isHitVal, isDefendVal) => {
            const isAllyUlt = sData && typeof sData.isAllyUltTurn === 'function' 
                ? sData.isAllyUltTurn(tVal) 
                : commonControls.ally_ult_count.isTurn(tVal);

            const ctx = {
                t: tVal, turns, charId, charData, stats, simState, 
                isUlt: isUltVal, targetCount, isHit: isHitVal, isDefend: isDefendVal,
                isAllyUltTurn: isAllyUlt,
                customValues: context.customValues,
                debugLogs: dLogsArray, 
                // [수정] 고정된 인자 대신 현재 객체의 isHit 상태를 참조
                setTimer: (key, dur) => {
                    simState[key] = ctx.isHit ? dur + 1 : dur;
                },
                // [수정] maxStacks 지원: 이미 꽉 찼으면 새로 추가하지 않고 가장 오래된 타이머를 갱신
                addTimer: (key, dur, data = {}, maxStacks = Infinity) => {
                    if (!simState[key]) simState[key] = [];
                    const finalDur = ctx.isHit ? dur + 1 : dur;
                    
                    if (simState[key].length < maxStacks) {
                        // 자리가 있으면 새로 추가
                        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
                            simState[key].push({ ...data, dur: finalDur });
                        } else {
                            simState[key].push(finalDur);
                        }
                    } else {
                        // 자리가 없으면 가장 오래된 것(0번)의 지속시간만 갱신
                        const oldest = simState[key][0];
                        if (typeof oldest === 'object') oldest.dur = finalDur;
                        else simState[key][0] = finalDur;
                    }
                },
                formatAction: (key, action) => formatStatusAction(key, action),
                getVal: (idx, key, stamp) => getSkillValue(idx, key, stamp || (isUltVal && stats.stamp)),
                isUnlocked: (idx) => {
                    const br = parseInt(stats.s1 || 0);
                    if (idx === 4 && br < 30) return false;
                    if (idx === 5 && br < 50) return false;
                    if (idx === 6 && br < 75) return false;
                    return true;
                },
                log: (idx, res, chance, dur, skipPush = false, customTag = null) => {
                    if (typeof idx === 'number') {
                        const br = parseInt(stats.s1 || 0);
                        if (idx === 4 && br < 30) return "";
                        if (idx === 5 && br < 50) return "";
                        if (idx === 6 && br < 75) return "";
                    }

                    let sName = "스킬", sIcon = "icon/main.png", label = "";
                    
                    if (typeof idx === 'number') {
                        const s = charData.skills[idx];
                        sName = s?.name || "알 수 없음";
                        sIcon = s?.icon || "icon/main.png";
                        label = customTag || (idx === 1 ? "필살기" : idx >= 7 ? "도장" : `패시브${idx-1}`);
                    } else if (typeof idx === 'string') {
                        const statusInfo = getStatusInfo(idx);
                        if (statusInfo) {
                            sName = statusInfo.name;
                            sIcon = statusInfo.icon;
                            label = customTag || ""; 
                        } else {
                            sName = idx; 
                            if (sName === "피격") { sIcon = "icon/simul.png"; label = ""; } 
                            else if (sName === "아군공격") { sIcon = "icon/compe.png"; label = ""; }
                            label = customTag || label;
                        }
                    }

                    let finalRes = res;
                    const actionMap = {
                        "Buff": "버프 발동",
                        "Trigger": "발동",
                        "Attack": "공격",
                        "apply": "부여",
                        "consume": "소모",
                        "all_consume": "모두 소모",
                        "gain": "획득",
                        "activate": "발동"
                    };
                    if (actionMap[res]) finalRes = actionMap[res];

                    let m = []; if (chance) m.push(`${chance}%`); if (dur) m.push(`${dur}턴`);
                    const mS = m.length ? ` (${m.join(' / ')})` : "";
                    const tag = label ? `<span class="sim-log-tag">[${label}]</span> ` : "";
                    const actionPart = finalRes ? ` ${finalRes}` : "";
                    const msg = `ICON:${sIcon}|${tag}${sName}${actionPart}${mS}`;
                    
                    if (!skipPush) {
                        dLogsArray.push(msg);
                        // [수정] 데미지 정보(': +')가 포함된 경우에만 메인 로그 리스트에 추가
                        const plainTag = label ? `<span class="sim-log-tag">[${label}]</span> ` : "";
                        const actionText = `${sName}${actionPart}${mS}`;
                        
                        if (actionText.includes(': +')) {
                            const parts = actionText.split(': ');
                            const info = parts[0];
                            const dmg = parts[1];
                            // 텍스트 구조 유지하며 데미지만 우측 정렬 클래스 부여
                            logs.push(`<div class="sim-log-line"><span>${tVal}턴: ${plainTag}${info}</span><span class="sim-log-dmg">${dmg}</span></div>`);
                        }
                    }
                    return msg; 
                },
                // [추가] 스킬 ID로 인덱스 찾기 헬퍼
                getSkillIdx: (skillId) => {
                    return charData.skills.findIndex(s => s.id === skillId);
                },
                // [추가] 공용 버프 부여 함수
                applyBuff: (skillParam) => {
                    const { prob, duration, label, originalId, maxStacks, customTag, skipTrigger, probSource } = skillParam;
                    
                    // 확률 결정: 직접 입력된 prob 혹은 UI에서 가져온 probSource
                    let finalProb = prob;
                    if (probSource && ctx.customValues[probSource] !== undefined) {
                        finalProb = ctx.customValues[probSource] / 100;
                    }

                    if (finalProb === undefined || Math.random() < finalProb) {
                        const timerKey = skillParam.timerKey || `${originalId?.split('_').pop()}_timer`;
                        if (maxStacks && maxStacks > 1) {
                            ctx.addTimer(timerKey, duration, {}, maxStacks);
                        } else {
                            ctx.setTimer(timerKey, duration);
                        }
                        
                        // [추가] 버프 부여 성공 이벤트 알림 (단, skipTrigger가 없을 때만)
                        if (originalId && !skipTrigger) {
                            ctx.checkStackTriggers(originalId);
                        }

                        const displayProb = finalProb && finalProb < 1 ? finalProb * 100 : null;
                        // skipPush를 false로 변경하여 상세 로그에는 남기도록 함
                        return ctx.log(ctx.getSkillIdx(originalId), label, displayProb, duration, false, customTag);
                    }
                    return "";
                },
                // [추가] 공용 추가타 생성 함수
                applyHit: (skillParam, val) => {
                    const { prob, label, originalId, skipTrigger, customTag } = skillParam;
                    if (prob === undefined || Math.random() < prob) {
                        return { 
                            val: val, 
                            chance: prob && prob < 1 ? prob * 100 : null, 
                            name: label, 
                            skillId: originalId,
                            skipTrigger: skipTrigger, // 결과 객체에 포함하여 전달
                            customTag: customTag
                        };
                    }
                    return null;
                },
                // [추가] 공용 스택 쌓기 함수
                gainStack: (skillParam) => {
                    const { maxStacks, label, originalId, customTag } = skillParam;
                    const stateKey = skillParam.stateKey || (skillParam.id ? `${skillParam.id}_stacks` : null);
                    if (!stateKey) return "";

                    const currentStacks = ctx.simState[stateKey] || 0;
                    const nextStacks = Math.min(maxStacks, currentStacks + 1);
                    ctx.simState[stateKey] = nextStacks;

                    let skillIdx = null;
                    if (originalId) {
                        skillIdx = charData.skills.findIndex(s => s.id === originalId);
                    } else {
                        const skillMatch = stateKey.match(/skill(\d+)/);
                        skillIdx = skillMatch ? parseInt(skillMatch[1]) - 1 : null;
                    }

                    return ctx.log(skillIdx !== -1 ? skillIdx : null, label, null, null, false, customTag);
                },
                // [추가] 유연한 스택 트리거 체크 함수
                checkStackTriggers: (triggerId) => {
                    const p = simParams[charId];
                    if (!p || !triggerId) return;
                    Object.values(p).forEach(param => {
                        if (param.type === "stack" && param.triggers?.includes(triggerId)) {
                            ctx.gainStack(param);
                        }
                    });
                },
                // [추가] 유연한 버프 트리거 체크 함수
                checkBuffTriggers: (triggerId) => {
                    const p = simParams[charId];
                    if (!p || !triggerId) return;
                    Object.values(p).forEach(param => {
                        if (param.type === "buff" && param.triggers?.includes(triggerId)) {
                            ctx.applyBuff(param);
                        }
                    });
                },
                // [추가] 만능 조건 체크 함수 (중첩 AND/OR 지원)
                checkCondition: (cond) => {
                    if (!cond) return true;
                    
                    // 1. AND 조건 (배열): 모든 요소가 참이어야 함
                    if (Array.isArray(cond)) {
                        return cond.every(c => ctx.checkCondition(c));
                    }
                    
                    // 2. OR 조건 (객체 { or: [...] }): 하나라도 참이면 됨
                    if (typeof cond === 'object') {
                        if (cond.or) return cond.or.some(c => ctx.checkCondition(c));
                        if (cond.and) return cond.and.every(c => ctx.checkCondition(c));
                        return true;
                    }
                    
                    // 3. 단일 조건 (문자열) 판별
                    if (typeof cond === 'string') {
                        // 기본 상태 체크
                        if (cond === "isUlt") return ctx.isUlt;
                        if (cond === "isNormal") return !ctx.isUlt && !ctx.isDefend;
                        if (cond === "isDefend") return ctx.isDefend;
                        if (cond === "!isDefend") return !ctx.isDefend;
                        if (cond === "isStamp") return stats.stamp;
                        
                        // 적 수 체크 (예: "targetCount:5", "targetCount:>=2")
                        if (cond.startsWith("targetCount:")) {
                            const expr = cond.split(":")[1];
                            if (expr.startsWith(">=")) return targetCount >= parseInt(expr.substring(2));
                            if (expr.startsWith("<=")) return targetCount <= parseInt(expr.substring(2));
                            if (expr.startsWith(">")) return targetCount > parseInt(expr.substring(1));
                            if (expr.startsWith("<")) return targetCount < parseInt(expr.substring(1));
                            return targetCount === parseInt(expr);
                        }
                        
                        // 특정 버프/스택 존재 여부 (예: "hasBuff:skill4", "hasStack:skill4_spirit:9")
                        if (cond.startsWith("hasBuff:")) {
                            const key = cond.split(":")[1] + "_timer";
                            const val = simState[key];
                            return Array.isArray(val) ? val.length > 0 : val > 0;
                        }
                        if (cond.startsWith("hasStack:")) {
                            const parts = cond.split(":");
                            const id = parts[1];
                            const targetVal = parts[2] ? parseInt(parts[2]) : 1;
                            
                            // 1. 직접 매칭되는 키가 있는지 확인
                            if (simState[id] !== undefined) return simState[id] >= targetVal;
                            
                            // 2. _stacks 접미사를 붙여서 확인
                            const stackKey = id.endsWith("_stacks") ? id : id + "_stacks";
                            return (simState[stackKey] || 0) >= targetVal;
                        }
                    }
                    return false;
                },
                // [추가] 가중치 기반 수치 계산 함수 (디버프 비중용)
                getWeightedVal: (skillParam, effectKey) => {
                    // 1. 활성화 여부 체크 (타이머 확인)
                    const timerKey = skillParam.timerKey || `${skillParam.originalId.split('_').pop()}_timer`;
                    const timerVal = ctx.simState[timerKey];
                    const isActive = Array.isArray(timerVal) ? timerVal.length > 0 : timerVal > 0;
                    
                    if (!isActive) return 0;

                    // 2. 기본 수치 가져오기 (testVal이 있으면 최우선 사용)
                    const baseVal = skillParam.testVal !== undefined ? skillParam.testVal : ctx.getVal(ctx.getSkillIdx(skillParam.originalId), effectKey);
                    const limit = skillParam.targetLimit;
                    
                    // 3. 비중 계산
                    // 타겟 제한이 없거나 전체 타겟이면 원본 수치 그대로 반환
                    if (!limit || limit >= targetCount) return baseVal;

                    const weight = limit / targetCount;
                    return baseVal * weight;
                }
            };
            return ctx;
        };

        for (let t = 1; t <= turns; t++) {
            const turnDebugLogs = [];
            const actionType = manualPattern[t-1] || (cd.ult === 0 ? 'ult' : 'normal');
            const isUlt = actionType === 'ult', isDefend = actionType === 'defend';
            const skill = isUlt ? charData.skills[1] : charData.skills[0];

            // [추가] 적 HP 자동 감소 로직
            if (context.customValues.enemy_hp_auto) {
                // 1턴부터 아군이 친 것으로 가정하여 감소 시작, 마지막 턴에 0% 도달
                const autoHp = Math.max(0, Math.floor(100 * (1 - t / turns)));
                context.customValues.enemy_hp_percent = autoHp;
            }

            // [수정] logs 배열을 makeCtx에 전달
            const dynCtx = makeCtx(t, isUlt, logs, turnDebugLogs, false, isDefend);
            
            let isHit = false;
            let hitTypeMsg = "";
            let isTaunted = false;
            
            let currentTDmg = 0;

            const getLatestSubStats = () => {
                const subStats = { "기초공증": 0, "공증": 0, "고정공증": 0, "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, "속성디버프": 0, "HP증가": 0, "기초HP증가": 0, "회복증가": 0, "배리어증가": 0, "지속회복증가": 0 };
                charData.skills.forEach((s, idx) => {
                    if (!charData.defaultBuffSkills?.includes(s.id) || idx === 1) return;
                    if (s.hasCounter || s.hasToggle || s.customLink) return;
                    if (idx >= 4 && idx <= 6 && br < [0,0,0,0,30,50,75][idx]) return;
                    if (s.buffEffects) for (const k in s.buffEffects) if (subStats.hasOwnProperty(k)) subStats[k] += getSkillValue(idx, k);
                });
                if (sData.getLiveBonuses) {
                    const liveBonuses = sData.getLiveBonuses(dynCtx);
                    for (const k in liveBonuses) {
                        if (subStats.hasOwnProperty(k)) {
                            const val = Number(liveBonuses[k]);
                            if (!isNaN(val)) subStats[k] += val;
                        }
                    }
                }
                const final = assembleFinalStats(baseStats, subStats);
                return { atk: final.최종공격력, subStats };
            };

            // [추가] 데미지 계산 및 로그 기록 통합 처리기
            const calculateAndLogHit = (event) => {
                // [복구] 매 타격 시점의 최신 스탯을 즉시 정산 (getLiveBonuses 결과값 포함)
                const latest = getLatestSubStats();
                
                let coefValue = 0;
                if (event.val !== undefined) coefValue = event.val;
                else coefValue = event.max || event.fixed || event.coef || 0;

                const targetSkillId = event.skillId;
                const s = charData.skills.find(sk => sk.id === targetSkillId);
                const isMulti = event.isMulti !== undefined ? event.isMulti : (s?.isMultiTarget || false);

                // [중요] 중복 합산 방지: 이미 latest.subStats 에 모든 보너스가 들어있으므로
                // 여기서 다시 비중을 계산하여 더해주면 안 됩니다.
                const currentStats = { ...latest.subStats };

                const dUnit = calculateDamage(event.type || "추가공격", latest.atk, currentStats, coefValue, false, charData.info.속성, enemyAttrIdx);
                const finalD = isMulti ? dUnit * targetCount : dUnit;
                
                const c = isMulti ? coefValue * targetCount : coefValue;
                const effectiveVul = currentStats["뎀증디버프"] + currentStats["속성디버프"];

                let label = "추가타";
                if (s) { 
                    const idx = charData.skills.indexOf(s); 
                    label = (idx === 0) ? "보통공격" : (idx === 1) ? "필살기" : (idx >= 2 && idx <= 6) ? `패시브${idx-1}` : "도장"; 
                }
                
                // [추가] 고유 태그(customTag)가 있으면 우선 사용
                if (event.customTag) {
                    label = event.customTag;
                }

                const baseName = event.name || s?.name || "추가타";
                const statParts = [`Coef:${c.toFixed(1)}%`, `Atk:${latest.atk.toLocaleString()}`];
                if (latest.subStats["뎀증"] !== 0) statParts.push(`Dmg:${latest.subStats["뎀증"].toFixed(1)}%`);
                if (latest.subStats["트리거뎀증"] !== 0) statParts.push(`T-Dmg:${latest.subStats["트리거뎀증"].toFixed(1)}%`);
                if (latest.subStats["뎀증디버프"] !== 0) statParts.push(`Vul:${latest.subStats["뎀증디버프"].toFixed(1)}%`);
                if (latest.subStats["속성디버프"] !== 0) statParts.push(`A-Vul:${latest.subStats["속성디버프"].toFixed(1)}%`);

                currentTDmg += finalD;
                
                // 1. 데미지 로그를 먼저 기록 (임시 보관소에 저장하여 순서 보장)
                if (finalD > 0) {
                    const plainTag = `<span class="sim-log-tag">[${label}]</span>`;
                    logs.push(`<div class="sim-log-line"><span>${t}턴: ${plainTag} ${baseName}${event.stack ? ' x'+event.stack : ''}:</span> <span class="sim-log-dmg">+${finalD.toLocaleString()}</span></div>`);
                }
                
                dynCtx.debugLogs.push({
                    type: 'action',
                    msg: `ICON:${s?.icon || 'icon/main.png'}|[${label}] ${baseName}${event.stack ? ' <span style="color:#ff4d4d">x'+event.stack+'</span>' : ''}: +${finalD.toLocaleString()}${event.chance ? ' ('+event.chance+'%)' : ''}`,
                    statMsg: statParts.join(' / ')
                });

                // 2. 그 다음에 스택 트리거 체크
                if (targetSkillId && !event.skipTrigger) {
                    dynCtx.checkStackTriggers(targetSkillId);
                }
            };

            const processExtra = (e) => {
                if (!e) return;

                // [추가] 발동 조건(condition) 체크 - 조건이 맞지 않으면 즉시 종료
                if (e.condition && !dynCtx.checkCondition(e.condition)) {
                    return;
                }

                // 1. 자동화된 파라미터 객체 처리
                if (e.type === "buff" || e.type === "hit" || e.type === "action") {
                    if (e.type === "buff") {
                        dynCtx.applyBuff(e);
                    } else if (e.type === "hit") {
                        const skillIdx = dynCtx.getSkillIdx(e.originalId);
                        const val = e.val !== undefined ? e.val : (e.valIdx !== undefined ? dynCtx.getVal(skillIdx, e.valIdx) : dynCtx.getVal(skillIdx, e.valKey || '추가공격'));
                        const hitRes = dynCtx.applyHit(e, val);
                        if (hitRes) {
                            calculateAndLogHit({ ...hitRes, isMulti: e.isMulti });
                        }
                    } else if (e.type === "action") {
                        if (e.action === "all_consume") {
                            const key = e.stateKey || (e.id + "_stacks");
                            dynCtx.simState[key] = 0;
                            // [수정] skipPush: false 를 위해 log 함수 호출 방식 변경
                            dynCtx.log(e.label || key, "all_consume");
                        }
                    }
                    return;
                }

                // 2. 레거시 및 커스텀 객체 처리
                if (e.skillId) {
                    const skillIdx = charData.skills.findIndex(s => s.id === e.skillId);
                    if (skillIdx !== -1 && !dynCtx.isUnlocked(skillIdx)) return;
                }

                const slots = [e.step1, e.step2, e.step3];
                if (!e.step1 && !e.step2 && !e.step3 && (e.coef !== undefined || e.val !== undefined)) {
                    slots[1] = e;
                }

                slots.forEach(slot => {
                    if (!slot) return;
                    let result = (typeof slot === 'function') ? slot(dynCtx) : slot;
                    if (!result) return;

                    const results = Array.isArray(result) ? result : [result];
                    results.forEach(res => {
                        if (typeof res === 'string') {
                            dynCtx.debugLogs.push(res);
                        } else {
                            calculateAndLogHit({ ...e, ...(typeof res === 'object' ? res : { val: res }) });
                        }
                    });
                });
                if (e.onattack2) e.onattack2(dynCtx);
            };

            const handleHook = (hookName) => {
                if (sData[hookName]) {
                    const res = sData[hookName](dynCtx);
                    // [핵심] flat(Infinity)를 통해 중첩 배열 구조를 지원하고 null/false 값을 걸러냄
                    if (res && res.extraHits) {
                        const flattened = res.extraHits.flat(Infinity).filter(Boolean);
                        
                        // [추가] order 속성이 있다면 그 순서대로 정렬하여 실행 (서순 보장)
                        flattened.sort((a, b) => {
                            const orderA = a.order || 999;
                            const orderB = b.order || 999;
                            return orderA - orderB;
                        });

                        flattened.forEach(processExtra);
                    }
                }
            };

            // [업그레이드] 단계별 또는 이벤트별 자동 파라미터 실행기
            const autoExecuteParams = (phaseOrEventName, activeCtx) => {
                const p = simParams[charId];
                if (!p) return;
                
                const targets = Object.values(p).filter(param => 
                    param.phase === phaseOrEventName || 
                    (param.triggers && param.triggers.includes(phaseOrEventName))
                );
                if (targets.length === 0) return;

                targets.sort((a, b) => {
                    const orderA = a.order !== undefined ? a.order : 999;
                    const orderB = b.order !== undefined ? b.order : 999;
                    return orderA - orderB;
                });

                // [중요] 주입받은 현재 컨텍스트를 사용하여 실행
                targets.forEach(param => {
                    // processExtra가 내부에서 dynCtx를 사용하도록 전달 (여기서는 클로저 사용 중)
                    processExtra(param);
                });
            };

            flow.forEach(step => {
                if (step === 'onTurn') {
                    // [추가] 턴 정보 기록 (적 HP 등)
                    if (context.customValues.enemy_hp_auto && context.customValues.enemy_hp_percent !== undefined) {
                        turnInfoLogs.push({ enemyHp: context.customValues.enemy_hp_percent });
                    } else {
                        turnInfoLogs.push({});
                    }

                    // [추가] 자동 타이머 관리 로직
                    for (const key in simState) {
                        if (key.endsWith('_timer')) {
                            // 1. 숫자형 타이머 처리
                            if (typeof simState[key] === 'number' && simState[key] > 0) {
                                simState[key]--;
                            }
                            // 2. 배열형 타이머 처리 (중첩 버프 등)
                            else if (Array.isArray(simState[key])) {
                                simState[key] = simState[key].map(v => {
                                    if (typeof v === 'number') return v - 1;
                                    if (typeof v === 'object' && v.dur !== undefined) return { ...v, dur: v.dur - 1 };
                                    return v;
                                }).filter(v => (typeof v === 'number' ? v > 0 : (v && v.dur > 0)));
                            }
                        }
                    }

                    handleHook('onTurn');
                    autoExecuteParams('onTurn'); // [복구] 턴 시작 자동 스킬 실행
                    
                    turnDebugLogs.forEach(item => {
                        if (typeof item === 'string') detailedLogs.push({ t, type: 'debug', msg: item });
                        else detailedLogs.push({ t, ...item });
                    });
                    turnDebugLogs.length = 0;
                    stateLogs.push(formatBuffState(charId, simState, charData, sData, stats));
                } else if (step === 'onCalculateDamage') {
                    handleHook('onCalculateDamage');
                    autoExecuteParams('onCalculateDamage'); // [복구] 설정 단계 자동 스킬 실행
                    
                    turnDebugLogs.forEach(item => {
                        if (typeof item === 'string') detailedLogs.push({ t, type: 'debug', msg: item });
                        else detailedLogs.push({ t, ...item });
                    });
                    turnDebugLogs.length = 0;
                } else if (step === 'onAttack') {
                    if (isDefend) {
                        const defenseTag = `<span class="sim-log-tag">[방어]</span>`;
                        logs.push(`<div class="sim-log-line"><span>${t}턴: ${defenseTag}</span> <span class="sim-log-dmg">+0</span></div>`);
                        dynCtx.debugLogs.push('ICON:icon/simul.png|[방어]');
                        
                        // [순서 교정] 먼저 기존 상태로 공격 훅을 처리한 후
                        handleHook('onAttack');
                    } else {
                        const mainStats = getLatestSubStats();
                        let mDmgSum = 0, mCoef = 0;
                        const targetType = isUlt ? "필살공격" : "보통공격";

                        // [복구] 엔진의 자동 합산을 제거하고, getLiveBonuses에서 정산된 값을 그대로 믿고 계산합니다.
                        const currentStats = { ...mainStats.subStats };

                        skill.damageDeal?.forEach((e, idx) => {
                            if (e.type !== targetType && e.type !== "기초공격") return;

                            // 이미 레벨 배율이 적용된 최종 계수 (getVal이 이미 곱해서 줌)
                            const finalCoef = dynCtx.getVal(charData.skills.indexOf(skill), idx);
                            
                            // 단일기면 1명, 아니면 전체 타격
                            const componentTargetCount = e.isSingleTarget ? 1 : targetCount;
                            const dUnit = calculateDamage(targetType, mainStats.atk, currentStats, finalCoef, isUlt && stats.stamp, charData.info.속성, enemyAttrIdx);
                            
                            // 로그용 계수 합산
                            const rawC = (isUlt && stats.stamp && e.val.stampMax) ? e.val.stampMax : e.val.max;
                            mCoef += rawC * componentTargetCount;
                            mDmgSum += dUnit * componentTargetCount;
                        });

                        const effectiveVul = currentStats["뎀증디버프"] + currentStats["속성디버프"];
                        const statParts = [`Coef:${mCoef.toFixed(1)}%`, `Atk:${mainStats.atk.toLocaleString()}`];
                        if (mainStats.subStats["뎀증"] !== 0) statParts.push(`Dmg:${mainStats.subStats["뎀증"].toFixed(1)}%`);
                        if (effectiveVul !== 0) statParts.push(`Vul:${effectiveVul.toFixed(1)}%`);
                        
                        const specDmgKey = isUlt ? "필살기뎀증" : "평타뎀증";
                        const specDmgLabel = isUlt ? "U-Dmg" : "N-Dmg";
                        if (mainStats.subStats[specDmgKey] !== 0) statParts.push(`${specDmgLabel}:${mainStats.subStats[specDmgKey].toFixed(1)}%`);
                        
                        if (mDmgSum > 0) {
                            const mainTag = `<span class="sim-log-tag">[${isUlt?'필살기':'보통공격'}]</span>`;
                            const dmgText = `<span class="sim-log-dmg">+${mDmgSum.toLocaleString()}</span>`;
                            logs.push(`<div class="sim-log-line"><span>${t}턴: ${mainTag} ${skill.name}:</span> ${dmgText}</div>`);
                            dynCtx.debugLogs.push({ type: 'action', msg: `ICON:${skill.icon}|${mainTag} ${skill.name}: ${dmgText}`, statMsg: statParts.join(' / ') });
                        }
                        currentTDmg = mDmgSum;

                        // [복구] 메인 공격 이벤트 알림 (스택 트리거 체크)
                        const p = simParams[charId];
                        if (p) {
                            const mainSkillId = isUlt ? p.ultTrigger : p.normalTrigger;
                            if (mainSkillId) dynCtx.checkStackTriggers(mainSkillId);
                        }

                        handleHook('onAttack');
                    }
                    autoExecuteParams(step); // 'action' 단계의 자동화 스킬들 실행
                    
                    turnDebugLogs.forEach(item => {
                        if (typeof item === 'string') {
                            detailedLogs.push({ t, type: 'debug', msg: item });
                        } else {
                            detailedLogs.push({ t, ...item });
                        }
                    });
                    turnDebugLogs.length = 0;
                } else if (step === 'onEnemyHit') {
                    // [수정] 조롱/고정 피격 메커니즘으로 확장
                    const tauntRes = sData.isTaunted && sData.isTaunted(dynCtx);
                    const tauntLabel = (typeof tauntRes === 'object' ? tauntRes.label : (typeof tauntRes === 'string' ? tauntRes : "조롱 상태"));
                    const tauntProb = (typeof tauntRes === 'object' && tauntRes.prob !== undefined ? tauntRes.prob : 100);
                    isTaunted = !!tauntRes;

                    const hProb = context.customValues.hit_prob || 0;
                    const nProb = context.customValues.normal_hit_prob || 0;
                    
                    isHit = false;
                    hitTypeMsg = "";

                    if (isTaunted) {
                        if (tauntProb >= 100 || Math.random() * 100 < tauntProb) {
                            isHit = true;
                            hitTypeMsg = formatStatusMessage(tauntLabel, tauntProb);
                        }
                    } else if (nProb > 0) {
                        if (!dynCtx.isAllyUltTurn && Math.random() * 100 < nProb) { isHit = true; hitTypeMsg = `보통공격 피격 발생 (${nProb}%)`; }
                    } else if (hProb > 0) {
                        if (Math.random() * 100 < hProb) { isHit = true; hitTypeMsg = `피격 발생 (${hProb}%)`; }
                    }
                    dynCtx.isHit = isHit;

                    if (isHit) {
                        const actualHitCount = isTaunted ? targetCount : 1;
                        for (let h = 0; h < actualHitCount; h++) {
                            const hitMsg = hitTypeMsg;
                            dynCtx.debugLogs.push(`ICON:icon/simul.png|${hitMsg}`);
                            
                            // [서순 보장] 피격 이벤트 발생 시에만 트리거된 스킬들을 실행
                            autoExecuteParams("being_hit");

                            handleHook('onEnemyHit');
                        }
                    }

                    turnDebugLogs.forEach(item => {
                        if (typeof item === 'string') detailedLogs.push({ t, type: 'debug', msg: item });
                        else detailedLogs.push({ t, ...item });
                    });
                    turnDebugLogs.length = 0;
                } else if (step === 'onAfterAction') {
                    handleHook('onAfterAction');
                    autoExecuteParams('onAfterAction'); // 행동 종료 자동 스킬 실행

                    turnDebugLogs.forEach(item => {
                        if (typeof item === 'string') detailedLogs.push({ t, type: 'debug', msg: item });
                        else detailedLogs.push({ t, ...item });
                    });
                    turnDebugLogs.length = 0;
                }
            });
            total += currentTDmg; perTurnDmg.push({ dmg: currentTDmg, cumulative: total });
            if (isUlt) cd.ult = ultCD - 1; else if (cd.ult > 0) cd.ult--;
        }
        iterationResults.push({ total, logs, perTurnDmg, stateLogs, detailedLogs, turnInfoLogs });
    }
    const totals = iterationResults.map(d => d.total), avg = Math.floor(totals.reduce((a, b) => a + b, 0) / iterations);
    const min = Math.min(...totals), max = Math.max(...totals), closest = iterationResults.sort((a, b) => Math.abs(a.total - avg) - Math.abs(b.total - avg))[0];
    
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
    const range = max - min, binCount = isMobile ? 30 : Math.min(iterations, 100), bins = new Array(binCount).fill(0);
    
    const centerIdx = Math.floor(binCount / 2);
    iterationResults.forEach(r => { let b = (range === 0) ? centerIdx : Math.floor(((r.total - min) / range) * (binCount - 1)); bins[b]++; });
    const xLabels = []; 
    if (range > 0) { for (let j = 0; j <= 5; j++) { const v = min + (range * (j / 5)); xLabels.push({ pos: (j / 5) * 100, label: v >= 1000 ? (v / 1000).toFixed(0) + 'K' : Math.floor(v) }); } } 
    else { xLabels.push({ pos: 50, label: min >= 1000 ? (min / 1000).toFixed(0) + 'K' : Math.floor(min) }); }
    
    return {
        min: min.toLocaleString(), max: max.toLocaleString(), avg: avg.toLocaleString(),
        logHtml: closest.logs.map(l => `<div>${l}</div>`).join(''),
        graphData: bins.map((c, i) => ({ h: (c / Math.max(...bins)) * 100, isAvg: (range === 0) ? (i === centerIdx) : (i === Math.floor(((closest.total - min) / range) * (binCount - 1))) })),
        axisData: { x: xLabels, y: Array.from({length: 6}, (_, i) => Math.floor(Math.max(...bins) * (5 - i) / 5)) },
        turnData: closest.perTurnDmg, closestTotal: closest.total, closestLogs: closest.logs, closestStateLogs: closest.stateLogs, closestDetailedLogs: closest.detailedLogs, closestTurnInfoLogs: closest.turnInfoLogs, yMax: Math.max(...bins)
    };
}
