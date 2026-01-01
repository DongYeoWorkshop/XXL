// simulator-engine.js
import { calculateDamage, calculateBaseStats, assembleFinalStats } from './calculations.js';
import { getSkillMultiplier } from './formatter.js';
import { commonControls } from './simulator-common.js';

/**
 * 버프 상태 표시용 포매터
 */
export function formatBuffState(state, charDataObj) {
    const entries = [];
    const getSkillInfo = (idx) => {
        const s = charDataObj.skills[idx];
        if (!s) return { label: "스킬", name: "알 수 없음", icon: "icon/main.png" };
        let label = (idx === 1) ? "필살기" : (idx >= 2 && idx <= 6) ? `패시브${idx - 1}` : (idx >= 7) ? "도장" : "스킬";
        return { label, name: s.name, icon: s.icon || "icon/main.png" };
    };

    for (const [key, val] of Object.entries(state)) {
        if (!val || val === 0 || (Array.isArray(val) && val.length === 0)) continue;
        if (key.startsWith('has_')) continue;

        let name = key, icon = 'icon/main.png', displayDur = "";

        const skillMatch = key.match(/^skill(\d+)/);
        if (skillMatch) {
            const idx = parseInt(skillMatch[1]);
            const skillIdx = idx > 0 ? idx - 1 : 0;
            const infoMapped = getSkillInfo(skillIdx);
            name = infoMapped.name;
            icon = infoMapped.icon;
            if (Array.isArray(val)) {
                const count = val.length;
                const maxTurn = Math.max(...val);
                displayDur = `${maxTurn}턴 / ${count}중첩`;
            }
        }
        else if (key.includes('battleSpirit')) { 
            const info = getSkillInfo(3); 
            name = "전의"; 
            icon = info.icon; 
            displayDur = `${val}중첩`;
        }
        else if (key === 'scar_active' || key === 'mark_of_engraving') { const info = getSkillInfo(1); name = "각흔"; icon = info.icon; }
        else if (key.includes('sleep_status')) { const info = getSkillInfo(1); name = "수면"; icon = info.icon; if (typeof val === 'object' && val.duration !== undefined) displayDur = `${val.duration}턴`; }
        else if (key === 'atk_stacks') { 
            const info = getSkillInfo(6); name = "패시브5"; icon = info.icon; 
            displayDur = `${val}중첩`; 
        }

        if (!displayDur) {
            const rawDur = Array.isArray(val) ? val.length : (typeof val === 'object' ? 'ON' : val);
            if (rawDur === true || rawDur === 'ON') displayDur = 'ON';
            else if (rawDur === false || rawDur === 0) continue;
            else if (Array.isArray(val)) displayDur = `${val[0]}턴 / ${val.length}중첩`; 
            else displayDur = `${rawDur}턴`;
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
                
                // [추가] 만약 여전히 e가 null이고 key가 'max'라면 calc[0]을 참조
                if (e === null && effectKey === 'max' && skill.calc && skill.calc[0]) {
                    e = skill.calc[0];
                }
        
                if (e === null && isStamp && skill.buffEffects && skill.buffEffects[effectKey] !== undefined) e = skill.buffEffects[effectKey];
        if (e === null) return 0;
        const val = (typeof e === 'object') ? ((charData.info.속성 === e.targetAttribute ? e.attributeMax : e.max) || e.fixed || 0) : e;
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
            // 해당 캐릭터의 sData(simCharData[id])에 커스텀 판정 함수가 있는지 확인
            // 없으면 공통 설정(ally_ult_count)에 정의된 기본 주기를 사용
            const isAllyUlt = sData && typeof sData.isAllyUltTurn === 'function' 
                ? sData.isAllyUltTurn(tVal) 
                : commonControls.ally_ult_count.isTurn(tVal);

            return {
                t: tVal, turns, charId, charData, stats, simState, 
                isUlt: isUltVal, targetCount, isHit: isHitVal, isDefend: isDefendVal,
                isAllyUltTurn: isAllyUlt,
                customValues: context.customValues,
                debugLogs: dLogsArray, 
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
            const isHit = (Math.random() * 100 < (hitProb || 0));
            const actionType = manualPattern[t-1] || (cd.ult === 0 ? 'ult' : 'normal');
            const isUlt = actionType === 'ult', isDefend = actionType === 'defend';
            const skill = isUlt ? charData.skills[1] : charData.skills[0];
            const dynCtx = makeCtx(t, isUlt, turnDebugLogs, isHit, isDefend);
            
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
                    slots[1] = e.coef;
                }

                slots.forEach(slot => {
                    if (slot === undefined || slot === null) return;
                    let result = (typeof slot === 'function') ? slot(dynCtx) : slot;
                    if (result === undefined || result === null) return;

                    // 로그 이벤트
                    if (typeof result === 'string' || Array.isArray(result)) {
                        const msgs = Array.isArray(result) ? result : [result];
                        msgs.forEach(m => { if (m) detailedLogs.push({ t, type: 'debug', msg: m }); });
                    } 
                    // 데미지 이벤트
                    else if (typeof result === 'number' || (typeof result === 'object' && (result.max || result.fixed || result.val))) {
                        const latest = getLatestSubStats();
                        let coefValue = 0;
                        let displayChance = "";

                        if (typeof result === 'object') {
                            if (result.val !== undefined) {
                                coefValue = result.val;
                                if (result.chance) displayChance = ` (${result.chance}%)`;
                            } else {
                                coefValue = result.max || result.fixed || 0;
                            }
                        } else {
                            coefValue = result;
                        }

                        const dUnit = calculateDamage(e.type || "추가공격", latest.atk, latest.subStats, coefValue, false, charData.info.속성, enemyAttrIdx);
                        const finalD = e.isMulti ? dUnit * targetCount : dUnit;
                        const c = e.isMulti ? coefValue * targetCount : coefValue;
                        const s = charData.skills.find(sk => sk.id === e.skillId);
                        let label = "추가타";
                        if (s) { const idx = charData.skills.indexOf(s); label = (idx === 0) ? "보통공격" : (idx === 1) ? "필살기" : (idx >= 2 && idx <= 6) ? `패시브${idx-1}` : "도장"; }
                        
                        const statParts = [];
                        statParts.push(`Coef:${c.toFixed(1)}%`);
                        statParts.push(`Atk:${latest.atk.toLocaleString()}`);
                        if (latest.subStats["뎀증"] !== 0) statParts.push(`Dmg:${latest.subStats["뎀증"].toFixed(1)}%`);
                        if (latest.subStats["트리거뎀증"] !== 0) statParts.push(`T-Dmg:${latest.subStats["트리거뎀증"].toFixed(1)}%`);

                        currentTDmg += finalD;
                        logs.push(`${t}턴: [${label}] ${e.name || s?.name || "추가타"} +${finalD.toLocaleString()}`);
                        detailedLogs.push({ 
                            t, type: 'action', 
                            msg: `ICON:${s?.icon || 'icon/main.png'}|[${label}] ${e.name || s?.name}: +${finalD.toLocaleString()}${displayChance}`, 
                            statMsg: statParts.join(' / ') 
                        });
                    }
                });
                if (e.onattack2) e.onattack2(dynCtx);
            };

            const handleHook = (hookName) => {
                if (sData[hookName]) {
                    const res = sData[hookName](dynCtx);
                    if (res && res.extraHits) res.extraHits.forEach(processExtra);
                }
            };

            flow.forEach(step => {
                if (step === 'onTurn') {
                    handleHook('onTurn');
                    // [추가] onTurn 로그 즉시 플러시 (공격 로그보다 위로)
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                    stateLogs.push(formatBuffState(simState, charData));
                } else if (step === 'setup') {
                    handleHook('onCalculateDamage');
                    // [추가] setup 로그 즉시 플러시
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                } else if (step === 'action') {
                    if (isDefend) {
                        logs.push(`${t}턴: [방어] - +0`);
                        detailedLogs.push({ t, type: 'action', msg: 'ICON:icon/simul.png|[방어]' });
                        handleHook('onAttack'); // 방어 중에도 공격 관련 훅은 실행
                    } else {
                        // [수정] 메인 액션 직전에 최신 스탯을 다시 한 번 갱신 (전의 9중첩 실시간 반영 등)
                        const mainStats = getLatestSubStats();
                        let mDmgSum = 0, mCoef = 0;
                        skill.damageDeal?.forEach(e => {
                            const c = (isUlt && stats.stamp && e.val.stampMax) ? e.val.stampMax : e.val.max;
                            const fC = c * getSkillMultiplier(parseInt(isUlt ? (stats.skills?.s2 || 1) : (stats.skills?.s1 || 1)), skill.startRate || 0.6);
                            const isM = skill.isMultiTarget || e.isMultiTarget;
                            mCoef += isM ? fC * targetCount : fC;
                            mDmgSum += calculateDamage(isUlt?"필살공격":"보통공격", mainStats.atk, mainStats.subStats, fC, isUlt && stats.stamp, charData.info.속성, enemyAttrIdx) * (isM ? targetCount : 1);
                        });

                        const statParts = [];
                        statParts.push(`Coef:${mCoef.toFixed(1)}%`);
                        statParts.push(`Atk:${mainStats.atk.toLocaleString()}`);
                        if (mainStats.subStats["뎀증"] !== 0) statParts.push(`Dmg:${mainStats.subStats["뎀증"].toFixed(1)}%`);
                        
                        const specDmgKey = isUlt ? "필살기뎀증" : "평타뎀증";
                        const specDmgLabel = isUlt ? "U-Dmg" : "N-Dmg";
                        if (mainStats.subStats[specDmgKey] !== 0) {
                            statParts.push(`${specDmgLabel}:${mainStats.subStats[specDmgKey].toFixed(1)}%`);
                        }

                        logs.push(`${t}턴: [${isUlt?'필살기':'보통공격'}] ${skill.name} +${mDmgSum.toLocaleString()}`);
                        detailedLogs.push({ 
                            t, type: 'action', 
                            msg: `ICON:${skill.icon}|[${isUlt?'필살기':'보통공격'}] ${skill.name}: +${mDmgSum.toLocaleString()}`, 
                            statMsg: statParts.join(' / ') 
                        });
                        currentTDmg = mDmgSum;
                        handleHook('onAttack');
                    }
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                } else if (step === 'hit') {
                    if (isHit) {
                        detailedLogs.push({ t, type: 'action', msg: `ICON:icon/simul.png|피격 발생 (${hitProb}%)` });
                        handleHook('onEnemyHit');
                    }
                    turnDebugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
                    turnDebugLogs.length = 0;
                } else if (step === 'extra') {
                    // 모든 extraHits는 이미 각 훅 단계에서 즉시 처리됨
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
    iterationResults.forEach(r => { let b = (range === 0) ? 0 : Math.floor(((r.total - min) / range) * (binCount - 1)); bins[b]++; });
    const xLabels = []; if (range > 0) { for (let j = 0; j <= 5; j++) { const v = min + (range * (j / 5)); xLabels.push({ pos: (j / 5) * 100, label: v >= 1000 ? (v / 1000).toFixed(0) + 'K' : Math.floor(v) }); } }

    return {
        min: min.toLocaleString(), max: max.toLocaleString(), avg: avg.toLocaleString(),
        logHtml: closest.logs.map(l => `<div>${l}</div>`).join(''),
        graphData: bins.map((c, i) => ({ h: (c / Math.max(...bins)) * 100, isAvg: i === Math.floor(((closest.total - min) / (range || 1)) * (binCount - 1)) })),
        axisData: { x: xLabels, y: Array.from({length: 6}, (_, i) => Math.floor(Math.max(...bins) * (5 - i) / 5)) },
        turnData: closest.perTurnDmg, closestTotal: closest.total, closestLogs: closest.logs, closestStateLogs: closest.stateLogs, closestDetailedLogs: closest.detailedLogs, yMax: Math.max(...bins)
    };
}