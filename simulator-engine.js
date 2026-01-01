// simulator-engine.js
import { calculateDamage, calculateBaseStats, assembleFinalStats } from './calculations.js';
import { getSkillMultiplier } from './formatter.js';
import { commonControls } from './simulator-common.js';

/**
 * 버프 상태 표시용 포매터
 */
export function formatBuffState(state, charDataObj, sData) {
    const entries = [];
    const getSkillInfo = (idx) => {
        let s = charDataObj.skills[idx];
        if (!s) return { label: "스킬", name: "알 수 없음", icon: "icon/main.png" };
        
        if (s.syncLevelWith) {
            const parentIdx = charDataObj.skills.findIndex(sk => sk.id === s.syncLevelWith);
            if (parentIdx !== -1) {
                idx = parentIdx;
                s = charDataObj.skills[parentIdx];
            }
        }

        let label = (idx === 1) ? "필살기" : (idx >= 2 && idx <= 6) ? `패시브${idx - 1}` : (idx >= 7) ? "도장" : "스킬";
        return { label, name: s.name, icon: s.icon || "icon/main.png" };
    };

    for (const [key, val] of Object.entries(state)) {
        if (!val || val === 0 || (Array.isArray(val) && val.length === 0)) continue;
        if (key.startsWith('has_')) continue;

        let name = "", icon = 'icon/main.png', displayDur = "";
        const customName = sData?.stateDisplay?.[key];
        const skillMatch = key.match(/^skill(\d+)/);
        
        if (skillMatch) {
            const skillNum = parseInt(skillMatch[1]);
            const info = getSkillInfo(skillNum - 1);
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
        else {
            if (customName) {
                name = customName;
                displayDur = typeof val === 'number' ? (key.includes('stack') ? `${val}중첩` : `${val}턴`) : "ON";
            } else {
                if (key === 'scar_active' || key === 'mark_of_engraving') { name = "[각흔]"; icon = charDataObj.skills[1]?.icon; displayDur = "ON"; }
                else if (key.includes('sleep_status')) { name = "[수면]"; icon = charDataObj.skills[1]?.icon; displayDur = val.duration ? `${val.duration}턴` : "ON"; }
                else if (key.includes('battleSpirit')) { name = "[전의]"; icon = charDataObj.skills[3]?.icon; displayDur = `${val}중첩`; }
                else continue;
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
        
        // [수정] 속성이 일치할 때 attributeMax가 없으면 max를 기본으로 사용
        const val = (typeof e === 'object') 
            ? ((charData.info.속성 === e.targetAttribute ? (e.attributeMax || e.max) : e.max) || e.fixed || 0) 
            : e;
        return val * (typeof e === 'object' && e.max ? rate : 1);
    };

    const iterationResults = [];
    const flow = sData.flow || ['onTurn', 'setup', 'action', 'hit', 'extra', 'onAfterAction'];

    for (let i = 0; i < iterations; i++) {
        let total = 0, simState = { battleSpirit: 0, atk_stacks: 0 };
        const ultCD = (() => { const m = charData.skills[1].desc?.match(/\(쿨타임\s*:\s*(\d+)턴\)/); return m ? parseInt(m[1]) : 3; })();
        let cd = { ult: ultCD };
        const logs = [], perTurnDmg = [], stateLogs = [], detailedLogs = [];

        const makeCtx = (tVal, isUltVal, dLogsArray, isHitVal, isDefendVal) => {
            const isAllyUlt = sData && typeof sData.isAllyUltTurn === 'function' 
                ? sData.isAllyUltTurn(tVal) 
                : commonControls.ally_ult_count.isTurn(tVal);

            return {
                t: tVal, turns, charId, charData, stats, simState, 
                isUlt: isUltVal, targetCount, isHit: isHitVal, isDefend: isDefendVal,
                isAllyUltTurn: isAllyUlt,
                customValues: context.customValues,
                debugLogs: dLogsArray, 
                // [추가] 타이머 설정 헬퍼 (피격 시 자동 +1 보정)
                setTimer: (key, dur) => {
                    simState[key] = isHitVal ? dur + 1 : dur;
                },
                // [추가] 중첩 타이머 추가 헬퍼 (배열용)
                addTimer: (key, dur, data = {}) => {
                    if (!simState[key]) simState[key] = [];
                    const finalDur = isHitVal ? dur + 1 : dur;
                    if (typeof data === 'object') {
                        simState[key].push({ ...data, dur: finalDur });
                    } else {
                        simState[key].push(finalDur);
                    }
                },
                getVal: (idx, key, stamp) => getSkillValue(idx, key, stamp || (isUltVal && stats.stamp)),
                log: (idx, res, chance, dur, skipPush = false) => {
                    let sName = "스킬", sIcon = "icon/main.png", label = "";
                    if (typeof idx === 'number') {
                        const s = charData.skills[idx];
                        sName = s?.name || "알 수 없음";
                        sIcon = s?.icon || "icon/main.png";
                        label = idx === 1 ? "필살기" : idx >= 7 ? "도장" : `패시브${idx-1}`;
                    } else if (typeof idx === 'string') {
                        sName = idx; 
                        if (sName === "피격") { sIcon = "icon/simul.png"; label = ""; } 
                        else if (sName === "아군공격") { sIcon = "icon/compe.png"; label = ""; }
                    }
                    let finalRes = res;
                    if (res === "Buff") finalRes = "버프 발동";
                    else if (res === "Trigger") finalRes = "발동";
                    else if (res === "Attack") finalRes = "공격";
                    let m = []; if (chance) m.push(`${chance}%`); if (dur) m.push(`${dur}턴`);
                    const mS = m.length ? ` (${m.join(' / ')})` : "";
                    const tag = label ? `[${label}] ` : "";
                    const actionPart = finalRes ? ` ${finalRes}` : "";
                    const msg = `ICON:${sIcon}|${tag}${sName}${actionPart}${mS}`;
                    if (!skipPush) dLogsArray.push(msg); 
                    return msg; 
                }
            };
        };

        for (let t = 1; t <= turns; t++) {
            const turnDebugLogs = [];
            const actionType = manualPattern[t-1] || (cd.ult === 0 ? 'ult' : 'normal');
            const isUlt = actionType === 'ult', isDefend = actionType === 'defend';
            const skill = isUlt ? charData.skills[1] : charData.skills[0];
            const dynCtx = makeCtx(t, isUlt, turnDebugLogs, false, isDefend);
            
            const hProb = context.customValues.hit_prob || 0;
            const nProb = context.customValues.normal_hit_prob || 0;
            let isHit = false;
            let hitTypeMsg = "";
            if (nProb > 0) {
                if (!dynCtx.isAllyUltTurn && Math.random() * 100 < nProb) { isHit = true; hitTypeMsg = `보통공격 피격 발생 (${nProb}%)`; }
            } else if (hProb > 0) {
                if (Math.random() * 100 < hProb) { isHit = true; hitTypeMsg = `피격 발생 (${hProb}%)`; }
            }
            dynCtx.isHit = isHit;
            
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
                        } 
                        // 데미지 이벤트 (숫자 또는 객체)
                        else if (typeof res === 'number' || (typeof res === 'object' && (res.max || res.fixed || res.val || res.coef))) {
                            const latest = getLatestSubStats();
                            let coefValue = 0;
                            let displayChance = "";
                            let stackSuffix = "";
                            let customName = e.name;
                            let targetSkillId = res.skillId || e.skillId; // 개별 스텝에서 skillId 지정 가능

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
                            
                            // 아이콘 및 레이블 결정
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
                            logs.push(`${t}턴: [${label}] ${baseName}${plainStack}: +${finalD.toLocaleString()}`);
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
                    handleHook('onTurn');
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                    stateLogs.push(formatBuffState(simState, charData, sData));
                } else if (step === 'setup') {
                    handleHook('onCalculateDamage');
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                } else if (step === 'action') {
                    if (isDefend) {
                        logs.push(`${t}턴: [방어] - +0`);
                        detailedLogs.push({ t, type: 'action', msg: 'ICON:icon/simul.png|[방어]' });
                        handleHook('onAttack');
                    } else {
                        const mainStats = getLatestSubStats();
                        let mDmgSum = 0, mCoef = 0;
                        skill.damageDeal?.forEach(e => {
                            const c = (isUlt && stats.stamp && e.val.stampMax) ? e.val.stampMax : e.val.max;
                            const fC = c * getSkillMultiplier(parseInt(isUlt ? (stats.skills?.s2 || 1) : (stats.skills?.s1 || 1)), skill.startRate || 0.6);
                            const isM = skill.isMultiTarget || e.isMultiTarget;
                            mCoef += isM ? fC * targetCount : fC;
                            mDmgSum += calculateDamage(isUlt?"필살공격":"보통공격", mainStats.atk, mainStats.subStats, fC, isUlt && stats.stamp, charData.info.속성, enemyAttrIdx) * (isM ? targetCount : 1);
                        });
                        const statParts = [`Coef:${mCoef.toFixed(1)}%`, `Atk:${mainStats.atk.toLocaleString()}`];
                        if (mainStats.subStats["뎀증"] !== 0) statParts.push(`Dmg:${mainStats.subStats["뎀증"].toFixed(1)}%`);
                        if (mainStats.subStats["뎀증디버프"] !== 0) statParts.push(`Vul:${mainStats.subStats["뎀증디버프"].toFixed(1)}%`);
                        if (mainStats.subStats["속성디버프"] !== 0) statParts.push(`A-Vul:${mainStats.subStats["속성디버프"].toFixed(1)}%`);
                        const specDmgKey = isUlt ? "필살기뎀증" : "평타뎀증";
                        const specDmgLabel = isUlt ? "U-Dmg" : "N-Dmg";
                        if (mainStats.subStats[specDmgKey] !== 0) statParts.push(`${specDmgLabel}:${mainStats.subStats[specDmgKey].toFixed(1)}%`);
                        logs.push(`${t}턴: [${isUlt?'필살기':'보통공격'}] ${skill.name} +${mDmgSum.toLocaleString()}`);
                        detailedLogs.push({ t, type: 'action', msg: `ICON:${skill.icon}|[${isUlt?'필살기':'보통공격'}] ${skill.name}: +${mDmgSum.toLocaleString()}`, statMsg: statParts.join(' / ') });
                        currentTDmg = mDmgSum;
                        handleHook('onAttack');
                    }
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                } else if (step === 'hit') {
                    if (isHit) {
                        detailedLogs.push({ t, type: 'action', msg: `ICON:icon/simul.png|${hitTypeMsg}` });
                        handleHook('onEnemyHit');
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
        iterationResults.push({ total, logs, perTurnDmg, stateLogs, detailedLogs });
    }
    const totals = iterationResults.map(d => d.total), avg = Math.floor(totals.reduce((a, b) => a + b, 0) / iterations);
    const min = Math.min(...totals), max = Math.max(...totals), closest = iterationResults.sort((a, b) => Math.abs(a.total - avg) - Math.abs(b.total - avg))[0];
    const range = max - min, binCount = Math.min(iterations, 100), bins = new Array(binCount).fill(0);
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
        turnData: closest.perTurnDmg, closestTotal: closest.total, closestLogs: closest.logs, closestStateLogs: closest.stateLogs, closestDetailedLogs: closest.detailedLogs, yMax: Math.max(...bins)
    };
}
