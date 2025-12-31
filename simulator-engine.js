// simulator-engine.js
import { calculateDamage, calculateBaseStats, assembleFinalStats } from './calculations.js';
import { getSkillMultiplier } from './formatter.js';

/**
 * 버프 상태를 사용자 친화적인 정보로 변환
 */
export function formatBuffState(state, charDataObj) {
    const entries = [];
    for (const [key, val] of Object.entries(state)) {
        if (!val || val === 0 || (Array.isArray(val) && val.length === 0)) continue;
        
        let name = key, icon = 'icon/main.png'; 
        
        if (key.includes('battleSpirit')) { name = '전의'; icon = charDataObj.skills[3]?.icon; }
        else if (key.includes('sleep_status')) { name = '수면'; icon = 'icon/main.png'; }
        else if (key.includes('stride_timers')) { name = '열화질보'; icon = charDataObj.skills[3]?.icon; }
        else if (key.includes('mark_timers')) { name = '호혈표지'; icon = charDataObj.skills[1]?.icon; }
        else if (key.includes('pressure_timers')) { name = '용족의 위압'; icon = charDataObj.skills[1]?.icon; }
        else if (key.includes('stamina_stacks')) { name = '체력응축'; icon = charDataObj.skills[1]?.icon; }
        else if (key.includes('rage_count')) { name = '용의 분노'; icon = charDataObj.skills[3]?.icon; }
        else if (key.includes('magic_focus')) { name = '마도 집중'; icon = charDataObj.skills[1]?.icon; }
        else if (key === 'p1_debuff' || key === 'p1_timer' || key.includes('p2_timer') || key.includes('p2_fixed')) { 
            name = (key === 'p1_debuff') ? '패시브1(디버프)' : '패시브1'; 
            icon = charDataObj.skills[3]?.icon || charDataObj.skills[2]?.icon; 
        }
        else if (key === 'p4_debuff' || key.includes('p3_timer')) { 
            name = (key === 'p4_debuff') ? '패시브4(디버프)' : '패시브2'; 
            icon = (key === 'p4_debuff') ? charDataObj.skills[6]?.icon : charDataObj.skills[3]?.icon; 
        }
        else if (key.includes('p4_timer')) { name = '패시브3'; icon = charDataObj.skills[4]?.icon; }
        else if (key.includes('p5_timer')) { name = '패시브4'; icon = charDataObj.skills[5]?.icon; }
        else if (key.includes('ult_timer') || key.includes('ult_atk') || key.includes('ult_fixed')) { name = '필살기'; icon = charDataObj.skills[1]?.icon; }
        
        const duration = Array.isArray(val) ? val.length : (typeof val === 'object' ? 'ON' : val);
        entries.push({ name, duration, icon: icon || 'icon/main.png' });
    }
    return entries;
}

/**
 * 시뮬레이션 핵심 엔진 (DOM 의존성 없음)
 */
export function runSimulationCore(context) {
    const { 
        charId, charData, sData, stats, turns, iterations, targetCount, 
        manualPattern, enemyAttrIdx, defaultGrowthRate 
    } = context;

    const lvVal = parseInt(stats.lv || 1);
    const brVal = parseInt(stats.s1 || 0);
    const fitVal = parseInt(stats.s2 || 0);
    
    // 기초 스탯 계산
    const baseStats = calculateBaseStats(charData.base, lvVal, brVal, fitVal, defaultGrowthRate);
    
    // 상시 패시브 수집
    const passiveStats = { "기초공증": 0, "공증": 0, "고정공증": 0, "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, "속성디버프": 0, "HP증가": 0, "기초HP증가": 0, "회복증가": 0, "배리어증가": 0, "지속회복증가": 0 };
    
    charData.skills.forEach((s, idx) => {
        const isDefaultBuff = charData.defaultBuffSkills?.includes(s.id);
        if (!isDefaultBuff || idx === 1) return;
        if (s.hasCounter || s.hasToggle || s.customLink) return;
        const th = [0, 0, 0, 0, 30, 50, 75]; 
        if (idx >= 4 && idx <= 6 && brVal < th[idx]) return;
        if (s.buffEffects) {
            const sLv = stats.skills?.[`s${idx+1}`] || 1; 
            const sRate = getSkillMultiplier(sLv, s.startRate || 0.6);
            for (const k in s.buffEffects) {
                if (passiveStats.hasOwnProperty(k)) {
                    const ef = s.buffEffects[k];
                    let valToAdd = 0;
                    if (typeof ef === 'object' && ef !== null) {
                        let baseMax = ef.max;
                        if (ef.targetAttribute !== undefined && charData.info.속성 === ef.targetAttribute && ef.attributeMax !== undefined) {
                            baseMax = ef.attributeMax;
                        }
                        valToAdd = (baseMax !== undefined ? baseMax * sRate : ef.fixed) || 0;
                    } else { valToAdd = ef || 0; }
                    passiveStats[k] += valToAdd;
                }
            }
        }
    });

    const ultCD = (() => {
        const m = charData.skills[1].desc?.match(/\(쿨타임\s*:\s*(\d+)턴\)/);
        return m ? parseInt(m[1]) : 3;
    })();

    const iterationResults = [];
    for (let i = 0; i < iterations; i++) {
        let total = 0;
        let cd = { ult: ultCD };
        let simState = { battleSpirit: 0, afterDefendTurns: 0, p2_timer: 0, p3_timer: 0, choi_passive3_ready: false }; 
        const logs = [], perTurnDmg = [], stateLogs = [], detailedLogs = [];

        for (let t = 1; t <= turns; t++) {
            const debugLogs = [];
            // 행동 전 로직
            if (sData.onTurn) sData.onTurn({ t, turns, charId, charData, stats, simState, customValues: context.customValues, debugLogs });
            debugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg })); 
            debugLogs.length = 0;

            stateLogs.push(formatBuffState(simState, charData));

            const action = manualPattern.length >= t ? manualPattern[t-1] : (cd.ult === 0 ? 'ult' : 'normal');
            const isUlt = (action === 'ult'), isDefend = (action === 'defend');
            const skill = isUlt ? charData.skills[1] : charData.skills[0];
            const sLv = isUlt ? (stats.skills?.s2 || 1) : (stats.skills?.s1 || 1);
            const isStamped = isUlt && stats.stamp;
            let tDmg = 0;

            if (isDefend) {
                logs.push(`${t}턴: [방어] - +0`);
                detailedLogs.push({ t, type: 'action', msg: '방어를 선택하여 공격하지 않았습니다.' });
            } else {
                let dynamicBonus = { extraHits: [] };
                if (sData.onCalculateDamage) {
                    dynamicBonus = sData.onCalculateDamage({ 
                        t, turns, isUlt, charData, stats, simState, customValues: context.customValues, 
                        targetCount, passiveStats, debugLogs 
                    }) || { extraHits: [] };
                }
                debugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg })); 
                debugLogs.length = 0;

                const dyn = dynamicBonus || {};
                const currentSubStats = { 
                    ...passiveStats, 
                    "기초공증": passiveStats["기초공증"] + (dyn["기초공증"] || 0),
                    "공증": passiveStats["공증"] + (dyn["공증"] || 0),
                    "고정공증": passiveStats["고정공증"] + (dyn["고정공증"] || 0),
                    "뎀증": passiveStats["뎀증"] + (dyn["뎀증"] || 0),
                    "평타뎀증": passiveStats["평타뎀증"] + (dyn["평타뎀증"] || 0),
                    "필살기뎀증": passiveStats["필살기뎀증"] + (dyn["필살기뎀증"] || 0),
                    "트리거뎀증": passiveStats["트리거뎀증"] + (dyn["트리거뎀증"] || 0),
                    "뎀증디버프": passiveStats["뎀증디버프"] + (dyn["뎀증디버프"] || 0),
                    "속성디버프": passiveStats["속성디버프"] + (dyn["속성디버프"] || 0)
                };

                const finalStats = assembleFinalStats(baseStats, currentSubStats);
                const currentTotalAtk = finalStats.최종공격력;
                
                const getStatStr = (label, val) => {
                    const parts = [`Atk:${currentTotalAtk.toLocaleString()}`];
                    if (currentSubStats["뎀증"] !== 0) parts.push(`Dmg:${Number(currentSubStats["뎀증"].toFixed(1))}%`);
                    if (val !== 0) parts.push(`${label}:${Number(val.toFixed(1))}%`);
                    if (currentSubStats["뎀증디버프"] !== 0) parts.push(`Vul:${Number(currentSubStats["뎀증디버프"].toFixed(1))}%`);
                    if (currentSubStats["속성디버프"] !== 0) parts.push(`A-Vul:${Number(currentSubStats["속성디버프"].toFixed(1))}%`);
                    return parts.join(' / ');
                };

                // 메인 데미지 계산
                let mainDmg = 0;
                if (skill.damageDeal && !dyn.skipMainDamage) {
                    skill.damageDeal.forEach(entry => {
                        const coef = (isStamped && entry.val.stampMax !== undefined) ? entry.val.stampMax : entry.val.max;
                        if (coef === undefined) return;
                        const finalCoef = coef * getSkillMultiplier(sLv, skill.startRate || 0.6);
                        const hitDmgUnit = calculateDamage(isUlt ? "필살공격" : "보통공격", currentTotalAtk, currentSubStats, finalCoef, isStamped, charData.info.속성, enemyAttrIdx);
                        let hitDmg = hitDmgUnit;
                        if ((entry.isMultiTarget ?? (isStamped ? entry.stampIsMultiTarget : skill.isMultiTarget)) && !entry.isSingleTarget) hitDmg *= targetCount;
                        mainDmg += hitDmg;
                    });
                    const tLabel = isUlt ? "U-Dmg" : "N-Dmg", tVal = isUlt ? currentSubStats["필살기뎀증"] : currentSubStats["평타뎀증"];
                    detailedLogs.push({ t, type: 'hit', msg: `[${isUlt ? '필살기' : '보통공격'}] ${skill.name}: +${mainDmg.toLocaleString()}`, statMsg: getStatStr(tLabel, tVal) });
                    logs.push(`${t}턴: [${isUlt ? '필살기' : '보통공격'}] ${skill.name} +${mainDmg.toLocaleString()}`);
                }
                tDmg = mainDmg;

                // 추가타 계산
                if (dyn.extraHits) {
                    dyn.extraHits.forEach(extra => {
                        const extraDmgUnit = calculateDamage(extra.type || "추가공격", currentTotalAtk, currentSubStats, extra.coef, false, charData.info.속성, enemyAttrIdx);
                        let extraFinalDmg = extraDmgUnit;
                        if (extra.isMulti) extraFinalDmg *= targetCount;
                        
                        let extraName = extra.name || '추가타', autoType = extra.type || '추가타';
                        if (extra.skillId) {
                            const skillObj = charData.skills.find(s => s.id === extra.skillId);
                            if (skillObj) {
                                if (!extra.name) extraName = skillObj.name;
                                const sIdx = charData.skills.indexOf(skillObj);
                                const getLabel = (idx) => {
                                    if (idx === 0) return "보통공격"; if (idx === 1) return "필살기";
                                    if (idx >= 2 && idx <= 6) return `패시브${idx - 1}`; return "도장";
                                };
                                autoType = getLabel(sIdx);
                                if (skillObj.syncLevelWith) {
                                    const tIdx = charData.skills.findIndex(s => s.id === skillObj.syncLevelWith);
                                    if (tIdx !== -1) autoType = getLabel(tIdx);
                                }
                            }
                        }
                        tDmg += extraFinalDmg;
                        logs.push(`${t}턴: [${autoType}] ${extraName} +${extraFinalDmg.toLocaleString()}`);
                        detailedLogs.push({ t, type: 'extra', msg: `[${autoType}] ${extraName}: +${extraFinalDmg.toLocaleString()}`, statMsg: getStatStr("T-Dmg", currentSubStats["트리거뎀증"]) });
                    });
                }
            }
            total += tDmg;
            perTurnDmg.push({ dmg: tDmg, cumulative: total });
            
            // 행동 후 로직
            if (sData.onAfterAction) sData.onAfterAction({ t, turns, isUlt, isDefend, stats, simState, customValues: context.customValues, debugLogs, charData });
            debugLogs.forEach(msg => detailedLogs.push({ t, type: 'debug', msg }));
            
            if (isUlt) cd.ult = ultCD - 1; else if (cd.ult > 0) cd.ult--;
        }
        iterationResults.push({ total, logs, perTurnDmg, stateLogs, detailedLogs });
    }

    // 통계 산출
    const totals = iterationResults.map(d => d.total);
    const avg = Math.floor(totals.reduce((a, b) => a + b, 0) / iterations);
    const min = Math.min(...totals), max = Math.max(...totals);
    const closest = iterationResults.reduce((prev, curr) => Math.abs(curr.total - avg) < Math.abs(prev.total - avg) ? curr : prev);
    const range = max - min, binCount = Math.min(iterations, 100), bins = new Array(binCount).fill(0);
    
    let targetBinIdx = -1;
    iterationResults.forEach(res => {
        let bIdx = (range === 0) ? Math.floor(binCount / 2) : Math.floor(((res.total - min) / range) * binCount);
        if (bIdx >= binCount) bIdx = binCount - 1;
        bins[bIdx]++;
        if (res === closest && targetBinIdx === -1) targetBinIdx = bIdx;
    });

    return {
        min: min.toLocaleString(),
        max: max.toLocaleString(),
        avg: avg.toLocaleString(),
        logHtml: closest.logs.map(l => `<div>${l}</div>`).join(''),
        graphData: bins.map((c, i) => ({ h: (c / Math.max(...bins)) * 100, isAvg: i === targetBinIdx, count: c })),
        turnData: closest.perTurnDmg,
        closestTotal: closest.total,
        closestLogs: closest.logs,
        closestStateLogs: closest.stateLogs,
        closestDetailedLogs: closest.detailedLogs,
        minRaw: min, maxRaw: max, avgRaw: avg
    };
}
