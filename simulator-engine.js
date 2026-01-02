// simulator-engine.js
import { calculateDamage, calculateBaseStats, assembleFinalStats } from './calculations.js';
import { getSkillMultiplier } from './formatter.js';
import { commonControls } from './simulator-common.js';
import { getStatusInfo, formatStatusMessage, formatStatusAction } from './simulator-status.js';

/**
 * 버프 상태 표시용 포매터
 */
export function formatBuffState(state, charDataObj, sData, stats) {
    const entries = [];
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
            name = customName || `[${info.label}]`;
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
        // [추가] 돌파 단계에 따른 스킬 잠금 체크
        const br = parseInt(stats.s1 || 0);
        if (skillIdx === 4 && br < 30) return 0; // 패시브3
        if (skillIdx === 5 && br < 50) return 0; // 패시브4
        if (skillIdx === 6 && br < 75) return 0; // 패시브5

        const skill = charData.skills[skillIdx];
        if (!skill) return 0;
        let targetIdx = skillIdx;
        if (skill.syncLevelWith) {
            const foundIdx = charData.skills.findIndex(s => s.id === skill.syncLevelWith);
            if (foundIdx !== -1) targetIdx = foundIdx;
        }
        const lvS = parseInt(stats.skills?.[`s${targetIdx+1}`] || 1);
        const rate = getSkillMultiplier(lvS, skill.startRate || 0.6);
        let e = null;
        const effects = isStamp ? skill.stampBuffEffects : skill.buffEffects;
        if (effects && effects[effectKey] !== undefined) e = effects[effectKey];
        else if (skill.damageDeal) {
            const d = skill.damageDeal.find(dmg => dmg.type === effectKey);
            if (d) e = d.val;
        }
        if (e === null && effectKey === 'max' && skill.calc && skill.calc[0]) e = skill.calc[0];
        if (e === null && isStamp && skill.buffEffects && skill.buffEffects[effectKey] !== undefined) e = skill.buffEffects[effectKey];
        if (e === null) return 0;
        
        const val = (typeof e === 'object' && e !== null) 
            ? (isStamp 
                ? (e.stampMax !== undefined ? e.stampMax : (e.stampFixed !== undefined ? e.stampFixed : (e.attributeMax || e.max || e.fixed || 0)))
                : ((charData.info.속성 === e.targetAttribute ? (e.attributeMax || e.max) : e.max) || e.fixed || 0)
              )
            : (e || 0);
        return val * (typeof e === 'object' && e.max ? rate : 1);
    };

    const iterationResults = [];
    const flow = sData.flow || ['onTurn', 'setup', 'action', 'hit', 'extra', 'onAfterAction'];

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
                log: (idx, res, chance, dur, skipPush = false) => {
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
                        label = idx === 1 ? "필살기" : idx >= 7 ? "도장" : `패시브${idx-1}`;
                    } else if (typeof idx === 'string') {
                        const statusInfo = getStatusInfo(idx);
                        if (statusInfo) {
                            sName = statusInfo.name;
                            sIcon = statusInfo.icon;
                            label = ""; 
                        } else {
                            sName = idx; 
                            if (sName === "피격") { sIcon = "icon/simul.png"; label = ""; } 
                            else if (sName === "아군공격") { sIcon = "icon/compe.png"; label = ""; }
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
                    for (const k in liveBonuses) if (subStats.hasOwnProperty(k)) subStats[k] += liveBonuses[k];
                }
                const final = assembleFinalStats(baseStats, subStats);
                return { atk: final.최종공격력, subStats };
            };

            const processExtra = (e) => {
                if (!e) return;

                // [추가] 돌파 단계에 따른 스킬 해금 여부 자동 체크
                if (e.skillId) {
                    const skillIdx = charData.skills.findIndex(s => s.id === e.skillId);
                    if (skillIdx !== -1) {
                        const br = parseInt(stats.s1 || 0);
                        // 패시브 3 (idx 4) -> 30단, 패시브 4 (idx 5) -> 50단, 패시브 5 (idx 6) -> 75단
                        if (skillIdx === 4 && br < 30) return;
                        if (skillIdx === 5 && br < 50) return;
                        if (skillIdx === 6 && br < 75) return;
                    }
                }

                const slots = [e.step1, e.step2, e.step3];
                // 하위 호환
                if (!e.step1 && !e.step2 && !e.step3 && e.coef !== undefined) {
                    if (e.msg) slots[0] = e.msg;
                    slots[1] = e;
                }

                slots.forEach(slot => {
                    if (slot === undefined || slot === null) return;
                    let result = (typeof slot === 'function') ? slot(dynCtx) : slot;
                    if (result === undefined || result === null) return;

                    // 결과가 배열인 경우 (여러 로그/데미지 처리)
                    const results = Array.isArray(result) ? result : [result];

                    results.forEach(res => {
                        // 로그 이벤트 (문자열)
                        if (typeof res === 'string') {
                            detailedLogs.push({ t, type: 'debug', msg: res });
                            // [수정] 메인 로그(logs)에는 더 이상 문자열(버프 발동 등)을 넣지 않음
                        } 
                        // 데미지 이벤트 (숫자 또는 객체)
                        else if (typeof res === 'number' || (typeof res === 'object' && (res.max || res.fixed || res.val || res.coef))) {
                            const latest = getLatestSubStats();
                            let coefValue = 0;
                            let displayChance = "";
                            let customName = e.name;
                            let targetSkillId = res.skillId || e.skillId;

                            let plainStack = "";
                            let richStack = "";
                            if (typeof res === 'object') {
                                coefValue = res.val || res.max || res.fixed || res.coef || 0;
                                if (res.chance) displayChance = ` (${res.chance}%)`;
                                if (res.name) customName = res.name;
                                if (res.stack) {
                                    plainStack = ` x${res.stack}`;
                                    richStack = ` <span style="color:#ff4d4d">x${res.stack}</span>`;
                                }
                            } else {
                                coefValue = res;
                            }

                            const dUnit = calculateDamage(e.type || "추가공격", latest.atk, latest.subStats, coefValue, false, charData.info.속성, enemyAttrIdx);
                            const finalD = e.isMulti ? dUnit * targetCount : dUnit;
                            const c = e.isMulti ? coefValue * targetCount : coefValue;
                            
                            const s = charData.skills.find(sk => sk.id === targetSkillId);
                            let label = "추가타";
                            if (s) { 
                                const idx = charData.skills.indexOf(s); 
                                label = (idx === 0) ? "보통공격" : (idx === 1) ? "필살기" : (idx >= 2 && idx <= 6) ? `패시브${idx-1}` : "도장"; 
                            }
                            
                            const statParts = [`Coef:${c.toFixed(1)}%`, `Atk:${latest.atk.toLocaleString()}`];
                            if (latest.subStats["뎀증"] !== 0) statParts.push(`Dmg:${latest.subStats["뎀증"].toFixed(1)}%`);
                            if (latest.subStats["트리거뎀증"] !== 0) statParts.push(`T-Dmg:${latest.subStats["트리거뎀증"].toFixed(1)}%`);
                            if (latest.subStats["뎀증디버프"] !== 0) statParts.push(`Vul:${latest.subStats["뎀증디버프"].toFixed(1)}%`);
                            if (latest.subStats["속성디버프"] !== 0) statParts.push(`A-Vul:${latest.subStats["속성디버프"].toFixed(1)}%`);

                            const baseName = customName || s?.name || "추가타";
                            currentTDmg += finalD;
                            
                            // [수정] 데미지가 0보다 큰 경우에만 메인 로그에 기록 (HTML 구조화)
                            if (finalD > 0) {
                                const plainTag = `<span class="sim-log-tag">[${label}]</span>`;
                                const dmgValue = `+${finalD.toLocaleString()}`;
                                const dmgText = `<span class="sim-log-dmg">${dmgValue}</span>`;
                                logs.push(`<div class="sim-log-line"><span>${t}턴: ${plainTag} ${baseName}${plainStack}:</span> ${dmgText}</div>`);
                            }
                            
                            detailedLogs.push({
                                t, type: 'action',
                                msg: `ICON:${s?.icon || 'icon/main.png'}|[${label}] ${baseName}${richStack}: +${finalD.toLocaleString()}${displayChance}`,
                                statMsg: statParts.join(' / ')
                            });
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
                        res.extraHits.flat(Infinity).filter(Boolean).forEach(processExtra);
                    }
                }
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
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                    stateLogs.push(formatBuffState(simState, charData, sData, stats));
                } else if (step === 'setup') {
                    handleHook('onCalculateDamage');
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                } else if (step === 'action') {
                    if (isDefend) {
                        const defenseTag = `<span class="sim-log-tag">[방어]</span>`;
                        logs.push(`<div class="sim-log-line"><span>${t}턴: ${defenseTag}</span> <span class="sim-log-dmg">+0</span></div>`);
                        detailedLogs.push({ t, type: 'action', msg: 'ICON:icon/simul.png|[방어]' });
                        handleHook('onAttack');
                    } else {
                        const mainStats = getLatestSubStats();
                        let mDmgSum = 0, mCoef = 0;
                        const targetType = isUlt ? "필살공격" : "보통공격";

                        skill.damageDeal?.forEach(e => {
                            // [수정] 현재 액션 타입과 일치하는 데미지만 메인 로그에 합산
                            if (e.type !== targetType && e.type !== "기초공격") return;

                            const c = (isUlt && stats.stamp && e.val.stampMax) ? e.val.stampMax : e.val.max;
                            const fC = c * getSkillMultiplier(parseInt(isUlt ? (stats.skills?.s2 || 1) : (stats.skills?.s1 || 1)), skill.startRate || 0.6);
                            const isM = skill.isMultiTarget || e.isMultiTarget;
                            mCoef += isM ? fC * targetCount : fC;
                            mDmgSum += calculateDamage(targetType, mainStats.atk, mainStats.subStats, fC, isUlt && stats.stamp, charData.info.속성, enemyAttrIdx) * (isM ? targetCount : 1);
                        });
                        const statParts = [`Coef:${mCoef.toFixed(1)}%`, `Atk:${mainStats.atk.toLocaleString()}`];
                        if (mainStats.subStats["뎀증"] !== 0) statParts.push(`Dmg:${mainStats.subStats["뎀증"].toFixed(1)}%`);
                        if (mainStats.subStats["뎀증디버프"] !== 0) statParts.push(`Vul:${mainStats.subStats["뎀증디버프"].toFixed(1)}%`);
                        if (mainStats.subStats["속성디버프"] !== 0) statParts.push(`A-Vul:${mainStats.subStats["속성디버프"].toFixed(1)}%`);
                        const specDmgKey = isUlt ? "필살기뎀증" : "평타뎀증";
                        const specDmgLabel = isUlt ? "U-Dmg" : "N-Dmg";
                        if (mainStats.subStats[specDmgKey] !== 0) statParts.push(`${specDmgLabel}:${mainStats.subStats[specDmgKey].toFixed(1)}%`);
                        
                        // [수정] 데미지가 0보다 큰 경우에만 메인 로그와 상세 로그 기록
                        if (mDmgSum > 0) {
                            const mainTag = `<span class="sim-log-tag">[${isUlt?'필살기':'보통공격'}]</span>`;
                            const dmgText = `<span class="sim-log-dmg">+${mDmgSum.toLocaleString()}</span>`;
                            logs.push(`<div class="sim-log-line"><span>${t}턴: ${mainTag} ${skill.name}:</span> ${dmgText}</div>`);
                            detailedLogs.push({ t, type: 'action', msg: `ICON:${skill.icon}|${mainTag} ${skill.name}: ${dmgText}`, statMsg: statParts.join(' / ') });
                        }
                        currentTDmg = mDmgSum;
                        handleHook('onAttack');
                    }
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                } else if (step === 'hit') {
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
                        // 조롱 메커니즘: 확률이 100%가 아닐 수도 있으므로 판정 수행
                        if (tauntProb >= 100 || Math.random() * 100 < tauntProb) {
                            isHit = true;
                            // [수정] 중앙 집중화된 메시지 포매터 사용
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
                        // [수정] 메인 로그(logs)에서는 피격 안내를 제거하여 딜량 집중
                        for (let h = 0; h < actualHitCount; h++) {
                            const hitMsg = hitTypeMsg;
                            
                            detailedLogs.push({ t, type: 'action', msg: `ICON:icon/simul.png|${hitMsg}` });
                            handleHook('onEnemyHit');
                        }
                    }
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                } else if (step === 'onAfterAction') {
                    handleHook('onAfterAction');
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                }
            });
            total += currentTDmg; perTurnDmg.push({ dmg: currentTDmg, cumulative: total });
            if (isUlt) cd.ult = ultCD - 1; else if (cd.ult > 0) cd.ult--;
        }
        iterationResults.push({ total, logs, perTurnDmg, stateLogs, detailedLogs, turnInfoLogs });
    }
    const totals = iterationResults.map(d => d.total), avg = Math.floor(totals.reduce((a, b) => a + b, 0) / iterations);
    const min = Math.min(...totals), max = Math.max(...totals), closest = iterationResults.sort((a, b) => Math.abs(a.total - avg) - Math.abs(b.total - avg))[0];
    
    // [수정] 모바일(600px 미만)에서는 30개, PC에서는 100개로 구간 설정
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
