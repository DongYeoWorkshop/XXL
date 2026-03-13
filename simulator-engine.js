// simulator-engine.js
import { calculateDamage, calculateBaseStats, assembleFinalStats } from './calculations.js';
import { commonControls } from './simulator-common.js';
import { getStatusInfo, formatStatusMessage, formatStatusAction } from './simulator-status.js';
import { simCharData } from './sim_data.js';
import { simDataV2 } from './sim_data2.js';
import { simParams } from './sim_params.js';
import { createSimulationContext, getSkillValue } from './sim_ctx.js';
import { initSupportState, processSupportTurn, processSupportEnemyHit, processSupportAttack, processSupportPostAttack, processSupportAfterHit, processSupportAfterAction, processSupportStepEnd, getSupportBonuses } from './sim_support.js';
import { formatMainLog } from './simulator-logger.js';
import { getCharacterCommonControls, getDefaultActionPattern } from './simulator-common.js';

/**
 * [추가] 시뮬레이션 실행 전 모든 설정 데이터를 수집함 (localStorage 기반)
 */
export function collectSimulationConfig(charId, charData) {
    const sData = simDataV2[charId] || simCharData[charId] || {};
    const turns = parseInt(localStorage.getItem('sim_last_turns') || "10");
    const iterations = parseInt(localStorage.getItem('sim_last_iters') || "100");
    const targetCount = parseInt(localStorage.getItem(`sim_last_target_${charId}`) || "1");
    const enemyAttrIdx = parseInt(localStorage.getItem(`sim_last_enemy_attr_${charId}`) || String(charData[charId]?.info?.속성 ?? 0));
    
    const combinedControls = [
        ...(sData.customControls || []),
        ...getCharacterCommonControls(sData.commonControls)
    ];
    
    const customValues = {}; 
    // 1. 메인 캐릭터 값 수집
    combinedControls.forEach(c => { 
        const v = localStorage.getItem(`sim_ctrl_${charId}_${c.id}`); 
        if (c.type === 'toggle') customValues[c.id] = (v !== null) ? (v === 'true') : (c.initial === true);
        else customValues[c.id] = (v !== null) ? parseInt(v) : (c.initial || 0);
        if (c.hasAuto && c.autoId) {
            const av = localStorage.getItem(`sim_ctrl_${charId}_${c.autoId}`);
            customValues[c.autoId] = (av === 'true');
        }
    });

    // 2. 서포터 1, 2 값 수집
    const supportId1 = localStorage.getItem(`sim_last_support_1_${charId}`) || 'none';
    const supportId2 = localStorage.getItem(`sim_last_support_2_${charId}`) || 'none';
    
    const fetchSupportValues = (sid, slotNum) => {
        if (sid === 'none') return;
        const sd = simDataV2[sid] || simCharData[sid]; if (!sd) return;
        const ctrlList = [...(sd.customControls || []), ...getCharacterCommonControls(sd.commonControls)];
        ctrlList.forEach(c => {
            const v = localStorage.getItem(`sim_ctrl_${sid}_${c.id}`);
            const finalKey = `s${slotNum}_${c.id}`;
            if (c.type === 'toggle') customValues[finalKey] = (v !== null) ? (v === 'true') : (c.initial === true);
            else customValues[finalKey] = (v !== null) ? parseInt(v) : (c.initial || 0);
            if (c.hasAuto && c.autoId) {
                const av = localStorage.getItem(`sim_ctrl_${sid}_${c.autoId}`);
                customValues[`s${slotNum}_${c.autoId}`] = (av === 'true');
            }
        });
    };

    fetchSupportValues(supportId1, 1);
    fetchSupportValues(supportId2, 2);

    return {
        turns,
        iterations,
        targetCount,
        enemyAttrIdx,
        customValues,
        supportIds: [supportId1, supportId2],
        manualPattern: JSON.parse(localStorage.getItem(`sim_pattern_${charId}`)) || [],
        extraPattern: JSON.parse(localStorage.getItem(`sim_pattern_extra_${charId}`)) || {}
    };
}

export function formatBuffState(charId, state, charDataObj, stats) {
    const sData = simDataV2[charId] || simCharData[charId] || {};
    const entries = [];
    const charParams = simParams[charId] || {};
    const getSkillInfo = (idx) => {
        const originalSkill = charDataObj.skills[idx];
        if (!originalSkill) return { label: "스킬", name: "알 수 없음", icon: "icon/main.png" };
        const isStampIcon = originalSkill.icon && originalSkill.icon.includes('sigilwebp/');
        let s = originalSkill;
        if (s.syncLevelWith) {
            const parentIdx = charDataObj.skills.findIndex(sk => sk.id === s.syncLevelWith);
            if (parentIdx !== -1) s = charDataObj.skills[parentIdx];
        }
        let label = isStampIcon ? "도장" : (idx === 1) ? "필살기" : (idx >= 2 && idx <= 6) ? `패시브${idx - 1}` : "스킬";
        return { label, name: originalSkill.name, icon: originalSkill.icon || "icon/main.png" };
    };
    for (const [key, val] of Object.entries(state)) {
        if (!val || val === 0 || (Array.isArray(val) && val.length === 0)) continue;
        if (key.startsWith('has_')) continue;
        let name = "", icon = 'icon/main.png', displayDur = "";
        const customName = sData?.stateDisplay?.[key];
        let foundCustomTag = null;
        const matchedParam = Object.values(charParams).find(p => p.stateKey === key || p.id === key || (p.id && `${p.id}_stacks` === key) || p.timerKey === key);
        if (matchedParam && matchedParam.customTag) foundCustomTag = matchedParam.customTag;

        const statusInfo = getStatusInfo(key);
        const skillMatch = key.match(/^skill(\d+)/);

        if (statusInfo) {
            name = statusInfo.name; icon = statusInfo.icon;
            if (Array.isArray(val)) displayDur = `${Math.max(...val.map(v => v.dur || v))}턴 / ${val.length}중첩`;
            else displayDur = typeof val === 'number' ? `${val}${statusInfo.unit || '턴'}` : "ON";
        } else if (skillMatch) {
            const skillIdx = parseInt(skillMatch[1]) - 1, br = parseInt(stats.s1 || 0);
            if ((skillIdx === 4 && br < 30) || (skillIdx === 5 && br < 50) || (skillIdx === 6 && br < 75)) continue;
            
            const info = getSkillInfo(skillIdx);
            name = customName || `[${info.label}]`;
            icon = info.icon;
            
            if (Array.isArray(val)) displayDur = `${Math.max(...val.map(v => v.dur || v))}턴 / ${val.length}중첩`;
            else displayDur = key.includes('stack') ? `${val}중첩` : `${val}턴`;
        } else if (customName) {
            name = customName;
            if (Array.isArray(val)) displayDur = `${Math.max(...val.map(v => v.dur || v))}턴 / ${val.length}중첩`;
            else displayDur = typeof val === 'number' ? (key.includes('stack') ? `${val}중첩` : `${val}턴`) : "ON";
        } else continue;

        entries.push({ name, duration: displayDur, icon });
    }
    return entries;
}

export function runSimulationCore(context) {
    let { charId, charData, stats, turns, iterations, targetCount, manualPattern, enemyAttrIdx, customValues, defaultGrowthRate, supportId, supportIds } = context;
    const sData = simDataV2[charId] || simCharData[charId] || {};
    const isV2 = !!simDataV2[charId];
    
    if (!supportIds) {
        supportIds = supportId ? [supportId] : [];
    }

    const br = parseInt(stats.s1 || 0), baseStats = calculateBaseStats(charData.base, parseInt(stats.lv || 1), br, parseInt(stats.s2 || 0), defaultGrowthRate, charData.grade);
    const iterationResults = [];
    const flow = sData.flow || ['onTurn', 'onCalculateDamage', 'onAttack', 'onEnemyHit', 'onAfterAction'];

    for (let i = 0; i < iterations; i++) {
        let simState = sData.initialState ? JSON.parse(JSON.stringify(sData.initialState)) : {};
        
        // [수정] 각 서포터별 상태 초기화
        let supportStates = supportIds.map(id => ({ id: id, state: initSupportState(id) }));
        
        let total = 0, logs = [], perTurnDmg = [], stateLogs = [], detailedLogs = [], turnInfoLogs = [];
        const ultCD = (() => { const m = charData.skills[1].desc?.match(/\(쿨타임\s*:\s*(\d+)턴\)/); return m ? parseInt(m[1]) : 3; })();
        let cd = { ult: ultCD };

        for (let t = 1; t <= turns; t++) {
            logs.push(`<div class="sim-log-turn-header" data-turn="${t}">----- ${t}턴 -----</div>`);
            const turnDebugLogs = [];
            const actionType = manualPattern[t-1] || (cd.ult === 0 ? 'ult' : 'normal');
            const isUlt = actionType === 'ult', isDefend = actionType === 'defend';
            const skill = isUlt ? charData.skills[1] : charData.skills[0];
            
            // [추가] 실시간 쿨타임 관리를 위한 플래그
            let ultimateUsedThisTurn = isUlt;

            if (customValues.enemy_hp_auto) customValues.enemy_hp_percent = Math.max(0, Math.floor(100 * (1 - t / turns)));

            const isAllyUltTurn = sData.isAllyUltTurn ? sData.isAllyUltTurn(t) : (t > 1 && (t - 1) % 3 === 0);
            const dynCtx = createSimulationContext({ t, turns, charId, charData, stats, baseStats, simState, isUlt, targetCount, isDefend, isAllyUltTurn, customValues, logs, debugLogs: turnDebugLogs, extraPattern: context.extraPattern });
            
            // [v2 지원] 즉시 데미지 계산 및 로그 예약 프로세서 주입
            dynCtx.onExecHit = (hitInfo) => {
                calculateAndLogHit(hitInfo);
            };
            
            // [추가] 캐릭터 로직에서 현재 최종 공격력을 스냅샷할 수 있도록 헬퍼 연결
            dynCtx.getAtk = (isMulti = true) => getLatestSubStats(isMulti).atk;

            // [추가] 이번 턴의 총 데미지를 컨텍스트에서 관리
            dynCtx.currentTDmg = 0;

            // [수정] 서포터 턴 시작 처리 (순회)
            supportStates.forEach(s => processSupportTurn(dynCtx, s.id, s.state));

            const getLatestSubStats = (isMulti = true) => {
                const subStats = { "기초공증": 0, "공증": 0, "고정공증": 0, "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, "속성디버프": 0, "HP증가": 0, "기초HP증가": 0, "회복증가": 0, "배리어증가": 0, "지속회복증가": 0 };
                dynCtx.isMulti = isMulti;
                
                // [수정] 모든 서포터의 보너스 합산
                supportStates.forEach(s => {
                    const sBonuses = getSupportBonuses(s.id, s.state, charData, dynCtx);
                    for (const k in sBonuses) if (subStats.hasOwnProperty(k)) subStats[k] += sBonuses[k];
                });

                charData.skills.forEach((s, idx) => {
                    if (!charData.defaultBuffSkills?.includes(s.id) || idx === 1) return;
                    if (s.hasCounter || s.hasToggle || s.customLink) return;
                    if (idx >= 4 && idx <= 6 && br < [0,0,0,0,30,50,75][idx]) return;
                    if (s.buffEffects) for (const k in s.buffEffects) if (subStats.hasOwnProperty(k)) subStats[k] += getSkillValue(charData, stats, idx, k);
                });
                if (sData.getLiveBonuses) {
                    const lb = sData.getLiveBonuses(dynCtx);
                    for (const k in lb) if (subStats.hasOwnProperty(k) && !isNaN(Number(lb[k]))) subStats[k] += Number(lb[k]);
                }
                const final = assembleFinalStats(baseStats, subStats);
                return { atk: final.최종공격력, subStats, raw: final };
            };

            const executeAction = (tag, label) => {
                const curIsUlt = dynCtx.isUlt;
                const curSkill = curIsUlt ? charData.skills[1] : charData.skills[0];
                const targetType = curIsUlt ? "필살공격" : "보통공격";

                curSkill.damageDeal?.forEach((e, idx) => {
                    if (e.type !== targetType && e.type !== "기초공격") return;
                    let isM = e.isSingleTarget ? false : (e.isMultiTarget || (stats.stamp && e.stampIsMultiTarget) || curSkill.isMultiTarget || false);
                    const tc = isM ? targetCount : 1;
                    const st = getLatestSubStats(isM);
                    const fC = dynCtx.getVal(curIsUlt ? 1 : 0, e.val || idx);
                    const hitDmg = calculateDamage(targetType, st.atk, st.subStats, fC, curIsUlt && stats.stamp, charData.info.속성, enemyAttrIdx) * tc;
                    const hitCoef = ((curIsUlt && stats.stamp && e.val?.stampMax) ? e.val.stampMax : (e.val?.max || e.val || 0)) * tc;

                    if (hitDmg > 0) {
                        dynCtx.damageOccurred = true; 
                        logs.push(formatMainLog(label, tag, curSkill.name, hitDmg));
                        const baseTags = { "뎀증": "Dmg", "뎀증디버프": "Vul", "속성디버프": "A-Vul" };
                        const specKey = curIsUlt ? "필살기뎀증" : "평타뎀증", specLabel = curIsUlt ? "U-Dmg" : "N-Dmg";
                        let dmgStr = Object.entries(baseTags).map(([key, l]) => st.subStats[key] !== 0 ? ` / ${l}:${parseFloat(st.subStats[key].toFixed(1))}%` : "").join("");
                        if (st.subStats[specKey] !== 0) dmgStr += ` / ${specLabel}:${parseFloat(st.subStats[specKey].toFixed(1))}%`;
                        
                        dynCtx.debugLogs.push({ type: 'action', msg: `ICON:${curSkill.icon}|[${tag}] ${curSkill.name}: +${Math.floor(hitDmg).toLocaleString()}`, statMsg: `Coef:${parseFloat((isM ? hitCoef : hitCoef/tc).toFixed(1))}% / Atk:${st.atk.toLocaleString()}${dmgStr}` });
                        dynCtx.currentTDmg += hitDmg;

                        // [수정] 메인 히트 후, 설정된 hit 수만큼 onAfterHit(반응형 추가타) 반복 호출
                        const hitCount = e.hits || 1;
                        for (let h = 0; h < hitCount; h++) {
                            handleHook('onAfterHit');
                            // [추가] 서포터 반응형 효과 실행
                            supportStates.forEach(s => processSupportAfterHit(dynCtx, s.id, s.state));
                            
                            while (dynCtx.extraHits && dynCtx.extraHits.length > 0) {
                                calculateAndLogHit(dynCtx.extraHits.shift());
                            }
                        }
                    }
                });
            };

            // [핵심] 모든 행동(메인/추가)을 수행하는 통합 함수
            const performAction = (targetIsUlt, targetIsDefend, tag, label) => {
                const originalUlt = dynCtx.isUlt;
                const originalDef = dynCtx.isDefend;
                
                dynCtx.isUlt = targetIsUlt;
                dynCtx.isDefend = targetIsDefend;

                if (dynCtx.isDefend) {
                    logs.push(formatMainLog(label, tag, "방어", 0));
                    dynCtx.debugLogs.push(`ICON:icon/simul.png|[${tag}]`);
                    handleHook('onAttack');
                    autoExecuteParams('onAttack');
                } else {
                    // 1. 메인 스킬 실행
                    executeAction(tag, label);
                    
                    // 2. 서포터 지원 공격 실행 (아누비로스 등 트리거)
                    supportStates.forEach(s => processSupportAttack(dynCtx, s.id, s.state));
                    
                    // 3. 즉시 큐 비우기 (아누비로스/신리랑의 연계 공격 실행)
                    while (dynCtx.extraHits && dynCtx.extraHits.length > 0) {
                        calculateAndLogHit(dynCtx.extraHits.shift());
                    }

                    // 4. 나머지 패시브 훅 및 트리거 처리
                    autoExecuteParams('onAttack'); 
                    handleHook('onAttack');
                }

                // [중요] 혹시라도 남은 추가타가 있다면 마저 처리
                while (dynCtx.extraHits && dynCtx.extraHits.length > 0) {
                    calculateAndLogHit(dynCtx.extraHits.shift());
                }

                dynCtx.isUlt = originalUlt;
                dynCtx.isDefend = originalDef;
            };

            const calculateAndLogHit = (event) => {
                // [추가] 타입이 stack이면 데미지 계산 및 공격 로그 출력을 생략 (이미 gainStack에서 처리됨)
                if (event.type === "stack") return;

                // [행동 재실행] 추가행동 시 유저가 설정한 패턴(보통/필살/방어)에 따라 재실행
                if (event.isActionReplay) {
                    const extraAction = event.extraActionType || 'ult';
                    const isExtraUlt = (extraAction === 'ult');
                    const isExtraDefend = (extraAction === 'defend');
                    
                    const replayTag = isExtraUlt ? "추가행동" : isExtraDefend ? "추가방어" : "추가평타";
                    const originalReplayTag = dynCtx.currentReplayTag;
                    dynCtx.currentReplayTag = replayTag;

                    if (isExtraUlt) ultimateUsedThisTurn = true;

                    // 메인 로직과 100% 동일한 함수 호출 (여기서 공격 + 패시브 다 처리됨)
                    performAction(isExtraUlt, isExtraDefend, replayTag, `${t}-2턴`);

                    // 2. 사후 처리 훅 (필살기 종료 등 상태 갱신)
                    handleHook('onAfterAction');
                    autoExecuteParams('onAfterAction');
                    
                    while (dynCtx.extraHits && dynCtx.extraHits.length > 0) {
                        const hit = dynCtx.extraHits.shift();
                        hit.customTag = replayTag;
                        calculateAndLogHit(hit);
                    }

                    dynCtx.currentReplayTag = originalReplayTag;
                    return;
                }

                const targetId = event.skillId || event.originalId;
                const sIdx = targetId ? charData.skills.findIndex(sk => sk.id === targetId) : -1;
                const s = sIdx !== -1 ? charData.skills[sIdx] : null;
                const isM = event.isMulti !== undefined ? event.isMulti : (s?.isMultiTarget || false);
                const latest = getLatestSubStats(isM);
                
                // [수정] valKey가 있으면 값을 동적으로 가져옴 (extraHits 직접 push 지원)
                let coef = event.val !== undefined ? event.val : (event.max || event.fixed || event.coef || 0);
                if (coef === 0 && event.valKey !== undefined && sIdx !== -1) {
                    coef = dynCtx.getVal(sIdx, event.valKey);
                }

                // [수정] dmgType 결정 로직 개선: hitType 우선, type이 "hit"이면 무시
                let dmgType = event.hitType;
                if (!dmgType) {
                    dmgType = (event.type && event.type !== "hit") ? event.type : "추가공격";
                }
                
                // [수정] 공격 타입이 "기초공격"인 경우 자동으로 기초공격력 사용
                let targetAtk = event.baseAtk !== undefined ? event.baseAtk : latest.atk;
                if (dmgType === "기초공격" && event.baseAtk === undefined && latest.raw) {
                    targetAtk = latest.raw.기초공격력;
                }

                const dUnit = calculateDamage(dmgType, targetAtk, latest.subStats, coef, false, charData.info.속성, enemyAttrIdx);
                const finalD = isM ? dUnit * targetCount : dUnit;
                
                if (finalD > 0) {
                    // [중요] 데미지를 컨텍스트의 TDmg에 합산 (이곳이 유일한 합산 지점)
                    dynCtx.currentTDmg += finalD;

                    if (event.customTag !== "서포터") {
                        dynCtx.damageOccurred = true; 
                        if (event.skillId) {
                            const originalIsUlt = dynCtx.isUlt;
                            const originalIsDefend = dynCtx.isDefend;

                            // 현재 추가행동의 종류에 따라 상태 강제 고정
                            if (dynCtx.currentReplayTag === "추가행동") {
                                dynCtx.isUlt = true;
                                dynCtx.isDefend = false;
                            } else if (dynCtx.currentReplayTag === "추가방어") {
                                dynCtx.isUlt = false;
                                dynCtx.isDefend = true;
                            } else if (dynCtx.currentReplayTag === "추가평타") {
                                dynCtx.isUlt = false;
                                dynCtx.isDefend = false;
                            }

                            dynCtx.checkStackTriggers(event.skillId);
                            dynCtx.checkBuffTriggers(event.skillId);

                            // 상태 복구
                            dynCtx.isUlt = originalIsUlt;
                            dynCtx.isDefend = originalIsDefend;
                        }
                    }
                    
                    const label = event.customTag || (sIdx !== -1 ? ((idx=sIdx) => (idx===0?'보통공격':idx===1?'필살기':idx<=6?`패시브${idx-1}`:'도장'))() : "추가타");
                    
                    // [수정] 현재가 추가행동(isActionReplay) 루프 안인지 확인하여 라벨 결정
                    const isReplayLoop = (dynCtx.currentReplayTag === "추가행동" || dynCtx.currentReplayTag === "추가평타" || dynCtx.currentReplayTag === "추가방어");
                    const turnLabel = dynCtx.isReactionStep ? `${t}턴(피격)` : (isReplayLoop ? `${t}-2턴` : `${t}턴`);
                    
                    logs.push(formatMainLog(turnLabel, dmgType === '보통공격' ? '보통공격' : label, event.name || s?.name || "추가타", finalD));

                    if (dynCtx.isReactionStep) {
                        supportStates.forEach(s => processSupportStepEnd(dynCtx, s.id, s.state, "onEnemyHit"));
                        dynCtx.damageOccurred = false; 
                    }

                    // [추가] 추가타(패시브 등) 직후 반응형 효과 처리 (무한 루프 방지를 위해 기초공격 제외)
                    if (dmgType !== "기초공격") {
                        handleHook('onAfterHit');
                        // [추가] 서포터 반응형 효과 실행
                        supportStates.forEach(s => processSupportAfterHit(dynCtx, s.id, s.state));
                    }
                }
                const sS = latest.subStats;
                const baseTags = { "뎀증": "Dmg", "뎀증디버프": "Vul", "속성디버프": "A-Vul" };
                let specKey = "", specLabel = "";
                if (dmgType === "보통공격") { specKey = "평타뎀증"; specLabel = "N-Dmg"; }
                else if (dmgType === "필살공격") { specKey = "필살기뎀증"; specLabel = "U-Dmg"; }
                else if (dmgType === "추가공격") { specKey = "트리거뎀증"; specLabel = "T-Dmg"; }
                
                // [수정] 도트공격/기초공격은 뎀증 문자열을 비워둠
                let dmgStr = "";
                if (dmgType !== "도트공격" && dmgType !== "기초공격") {
                    dmgStr = Object.entries(baseTags).map(([key, label]) => sS[key] !== 0 ? ` / ${label}:${parseFloat(sS[key].toFixed(1))}%` : "").join("");
                    if (specKey && sS[specKey] !== 0) dmgStr += ` / ${specLabel}:${parseFloat(sS[specKey].toFixed(1))}%`;
                }

                const iconPath = event.icon || s?.icon || 'icon/main.png';
                const debugChanceText = event.chance ? ` (${event.chance}%)` : '';
                
                // [수정] 기초공격 타입일 경우 라벨을 B-Atk으로 변경하여 구분
                const logAtkLabel = dmgType === "기초공격" ? "B-Atk" : "Atk";
                const logAtk = event.baseAtk !== undefined ? event.baseAtk : targetAtk;
                
                dynCtx.debugLogs.push({ type: 'action', msg: `ICON:${iconPath}|[${dmgType === '보통공격' ? '보통공격' : (event.customTag || "추가타")}] ${event.name || s?.name || "추가타"}: +${Math.floor(finalD).toLocaleString()}${debugChanceText}`, statMsg: `Coef:${parseFloat((isM ? coef * targetCount : coef).toFixed(1))}% / ${logAtkLabel}:${logAtk.toLocaleString()}${dmgStr}` });
            };

            const processExtra = (e) => {
                if (!e) return;
                
                // [실제 코드 수정] 판정 직전, dynCtx의 상태를 명확히 고정
                const targetSkillId = e.skillId || e.originalId;
                if (targetSkillId) { const skillIdx = dynCtx.getSkillIdx(targetSkillId); if (skillIdx !== -1 && !dynCtx.isUnlocked(skillIdx)) return; }
                
                // 엔진이 현재 performAction에서 설정한 isDefend 상태를 무시하지 못하도록 함
                if (e.condition && !dynCtx.checkCondition(e.condition)) return;
                
                if (e.type === "buff" || e.type === "hit" || e.type === "action" || e.type === "stack") {
                    if (e.type === "buff") dynCtx.applyBuff(e);
                    else if (e.type === "hit") {
                        const idx = dynCtx.getSkillIdx(e.originalId);
                        const valKey = e.valKey !== undefined ? e.valKey : '추가공격';
                        const val = e.val !== undefined ? e.val : (e.valIdx !== undefined ? dynCtx.getVal(idx, e.valIdx) : dynCtx.getVal(idx, valKey));
                        const res = dynCtx.applyHit(e, val);
                        if (res) calculateAndLogHit({ ...res, isMulti: e.isMulti });
                    } else if (e.type === "action") {
                        if (e.action === "all_consume") {
                            const key = e.stateKey || (e.id + "_stacks"); dynCtx.simState[key] = 0; dynCtx.log(e, "all_consume");
                        } else if (typeof e.action === 'function') {
                            e.action(dynCtx);
                        }
                    } else if (e.type === "stack") dynCtx.gainStack(e);
                    return;
                }
                const slots = [e.step1, e.step2, e.step3]; if (!e.step1 && !e.step2 && !e.step3 && (e.coef !== undefined || e.val !== undefined)) slots[1] = e;
                slots.forEach(slot => {
                    if (!slot) return;
                    let res = (typeof slot === 'function') ? slot(dynCtx) : slot;
                    if (!res) return;
                    (Array.isArray(res) ? res : [res]).forEach(r => {
                        if (typeof r === 'string') dynCtx.debugLogs.push(r);
                        else calculateAndLogHit({ ...e, ...(typeof r === 'object' ? r : { val: r }) });
                    });
                });
            };

            const autoExecuteParams = (phase) => {
                const p = simParams[charId]; if (!p) return;
                Object.values(p).filter(param => param.phase === phase || (param.triggers && param.triggers.includes(phase)))
                    .sort((a, b) => (a.order !== undefined ? a.order : 999) - (b.order !== undefined ? b.order : 999)).forEach(processExtra);
            };

            const handleHook = (hook) => {
                const res = sData[hook]?.(dynCtx);
                if (res?.extraHits) res.extraHits.flat(Infinity).filter(Boolean).sort((a, b) => (a.order || 999) - (b.order || 999)).forEach(processExtra);
            };

            flow.forEach(step => {
                dynCtx.isReactionStep = (step === 'onEnemyHit'); 
                if (step === 'onTurn') {
                    if (context.customValues.enemy_hp_auto) turnInfoLogs.push({ enemyHp: context.customValues.enemy_hp_percent }); else turnInfoLogs.push({});
                    for (const key in simState) if (key.endsWith('_timer')) {
                        if (typeof simState[key] === 'number' && simState[key] > 0) simState[key]--;
                        else if (Array.isArray(simState[key])) simState[key] = simState[key].map(v => (typeof v === 'number' ? v - 1 : { ...v, dur: v.dur - 1 })).filter(v => (v.dur || v) > 0);
                    }
                    handleHook('onTurn'); autoExecuteParams(step);
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
                    turnDebugLogs.length = 0;
                    stateLogs.push(formatBuffState(charId, simState, charData, stats));
                } else if (step === 'onCalculateDamage') {
                    handleHook('onCalculateDamage'); autoExecuteParams(step);
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
                    turnDebugLogs.length = 0;
                } else if (step === 'onAttack') {
                    // [수정] 공통 함수를 사용하여 메인 공격/방어 수행
                    const mainTag = isUlt ? '필살기' : isDefend ? '방어' : '보통공격';
                    performAction(isUlt, isDefend, mainTag, `${t}턴`);
                    
                    // [추가] 메인 캐릭터의 모든 공격(패시브 포함)이 끝난 후 서포터의 후속 처리 (임부언 등)
                    if (step === 'onAttack') {
                        supportStates.forEach(s => processSupportPostAttack(dynCtx, s.id, s.state));
                        while (dynCtx.extraHits && dynCtx.extraHits.length > 0) {
                            calculateAndLogHit(dynCtx.extraHits.shift());
                        }
                    }
                } else if (step === 'onEnemyHit') {
                    const tr = sData.isTaunted?.(dynCtx);
                    const tl = (typeof tr === 'object' ? tr.label : tr) || "조롱 상태", tp = tr?.prob || 100;
                    let isHit = false; let msg = "";
                    if (tr) { if (tp >= 100 || Math.random() * 100 < tp) { isHit = true; msg = formatStatusMessage(tl, tp); } }
                    else if (context.customValues.normal_hit_prob > 0 && !dynCtx.isAllyUltTurn && Math.random() * 100 < context.customValues.normal_hit_prob) { isHit = true; msg = `보통공격 피격 (${context.customValues.normal_hit_prob}%)`; }
                    else if (context.customValues.hit_prob > 0 && Math.random() * 100 < context.customValues.hit_prob) { isHit = true; msg = `피격 (${context.customValues.hit_prob}%)`; }
                    
                    if (isHit) {
                        dynCtx.isHit = true;
                        for (let h = 0; h < (tr ? targetCount : 1); h++) {
                            dynCtx.debugLogs.push(`ICON:icon/simul.png|${msg}`);
                            autoExecuteParams("being_hit");
                            while (dynCtx.extraHits.length > 0) {
                                calculateAndLogHit(dynCtx.extraHits.shift());
                                // [수정] 서포터 단계 종료 (순회)
                                supportStates.forEach(s => processSupportStepEnd(dynCtx, s.id, s.state, "being_hit_sub"));
                                dynCtx.damageOccurred = false; 
                            }
                        }
                    }
                    // [수정] 서포터 피격 반응 (순회)
                    supportStates.forEach(s => processSupportEnemyHit(dynCtx, s.id, s.state));
                    handleHook('onEnemyHit');
                    
                    while (dynCtx.extraHits.length > 0) {
                        const hit = dynCtx.extraHits.shift();
                        calculateAndLogHit(hit);
                    }
                    
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
                    turnDebugLogs.length = 0;
                } else if (step === 'onAfterAction') {
                    // [수정] 서포터 행동 종료 후 처리 (순회)
                    supportStates.forEach(s => processSupportAfterAction(dynCtx, s.id, s.state));
                    handleHook('onAfterAction'); autoExecuteParams(step);
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
                    turnDebugLogs.length = 0;
                }

                if (dynCtx.extraHits && dynCtx.extraHits.length > 0) {
                    dynCtx.extraHits.forEach(e => { 
                        calculateAndLogHit(e); 
                        if (step === 'onEnemyHit') {
                            // [수정] 서포터 단계 종료 (순회)
                            supportStates.forEach(s => processSupportStepEnd(dynCtx, s.id, s.state, "being_hit_sub"));
                            dynCtx.damageOccurred = false; 
                        }
                    });
                    dynCtx.extraHits = [];
                }

                // [수정] 서포터 단계 종료 처리 (순회)
                supportStates.forEach(s => processSupportStepEnd(dynCtx, s.id, s.state, step));
                
                // [추가] 메인 캐릭터 단계 종료 처리 (수면 해제 등)
                handleHook('onStepEnd');

                dynCtx.damageOccurred = false; 
            });
            // [중요 수정] 이제 currentTDmg 변수가 아닌 dynCtx.currentTDmg에서 합산 결과를 가져옴
            total += dynCtx.currentTDmg; perTurnDmg.push({ dmg: dynCtx.currentTDmg, cumulative: total });
            if (ultimateUsedThisTurn) cd.ult = ultCD - 1; else if (cd.ult > 0) cd.ult--;
        }
        iterationResults.push({ total, logs, perTurnDmg, stateLogs, detailedLogs, turnInfoLogs });
    }
    const totals = iterationResults.map(d => d.total), avg = Math.floor(totals.reduce((a, b) => a + b, 0) / iterations);
    const min = Math.min(...totals), max = Math.max(...totals);
    const sortedIterationResults = [...iterationResults].sort((a, b) => a.total - b.total);
    const minRes = sortedIterationResults[Math.floor(iterations * 0.05)] || sortedIterationResults[0];
    const maxRes = sortedIterationResults[Math.floor(iterations * 0.95)] || sortedIterationResults[iterationResults.length - 1];
    const avgRes = iterationResults.sort((a, b) => Math.abs(a.total - avg) - Math.abs(b.total - avg))[0];
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 600;
    const range = max - min;
    const binCount = isMobile ? 30 : Math.min(iterations, 100);
    const bins = new Array(binCount).fill(0);
    const centerIdx = Math.floor(binCount / 2);
    iterationResults.forEach(r => { let b = (range === 0) ? centerIdx : Math.floor(((r.total - min) / range) * (binCount - 1)); bins[b]++; });
    
    // [수정] PC 버전에서는 라벨을 더 촘촘하게 (10등분) 표시하여 가로축을 가득 채움
    const xLabelCount = isMobile ? 5 : 10;
    const xLabels = []; 
    if (range > 0) {
        for (let j = 0; j <= xLabelCount; j++) { 
            const v = min + (range * (j / xLabelCount)); 
            xLabels.push({ pos: (j / xLabelCount) * 100, label: v >= 1000 ? (v / 1000).toFixed(0) + 'K' : Math.floor(v) }); 
        }
    } else {
        xLabels.push({ pos: 50, label: min >= 1000 ? (min / 1000).toFixed(0) + 'K' : Math.floor(min) });
    }
    return { min: min.toLocaleString(), max: max.toLocaleString(), avg: avgRes.total.toLocaleString(), p05: minRes.total.toLocaleString(), p95: maxRes.total.toLocaleString(), results: { min: minRes, avg: avgRes, max: maxRes }, graphData: bins.map((c, i) => { const binStart = min + (range * (i / binCount)), binEnd = min + (range * ((i + 1) / binCount)), binMid = (binStart + binEnd) / 2, inRange = (binMid >= minRes.total && binMid <= maxRes.total), isAvg = (range === 0) ? (i === centerIdx) : (i === Math.floor(((avgRes.total - min) / range) * (binCount - 1))); return { h: (c / Math.max(...bins)) * 100, isAvg: isAvg, inRange: inRange }; }), axisData: { x: xLabels, y: Array.from({length: 6}, (_, i) => Math.floor(Math.max(...bins) * (5 - i) / 5)) }, yMax: Math.max(...bins) };
}