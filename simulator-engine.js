// simulator-engine.js
import { calculateDamage, calculateBaseStats, assembleFinalStats } from './calculations.js';
import { commonControls } from './simulator-common.js';
import { getStatusInfo, formatStatusMessage, formatStatusAction } from './simulator-status.js';
import { simParams } from './sim_params.js';
import { createSimulationContext, getSkillValue } from './sim_ctx.js';

export function formatBuffState(charId, state, charDataObj, sData, stats) {
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
        const matchedParam = Object.values(charParams).find(p => p.stateKey === key || p.id === key || (p.id && `${p.id}_stacks` === key));
        if (matchedParam && matchedParam.customTag) foundCustomTag = matchedParam.customTag;
        const skillMatch = key.match(/^skill(\d+)/);
        if (skillMatch) {
            const skillIdx = parseInt(skillMatch[1]) - 1, br = parseInt(stats.s1 || 0);
            if ((skillIdx === 4 && br < 30) || (skillIdx === 5 && br < 50) || (skillIdx === 6 && br < 75)) continue;
            const info = getSkillInfo(skillIdx);
            name = foundCustomTag ? `[${foundCustomTag}]` : (customName || `[${info.label}]`);
            icon = info.icon;
            if (Array.isArray(val)) displayDur = `${Math.max(...val.map(v => v.dur || v))}턴 / ${val.length}중첩`;
            else displayDur = key.includes('stack') ? `${val}중첩` : `${val}턴`;
        } else {
            const statusInfo = getStatusInfo(key);
            if (statusInfo) {
                name = statusInfo.name; icon = statusInfo.icon;
                if (Array.isArray(val)) displayDur = `${Math.max(...val.map(v => v.dur || v))}턴 / ${val.length}중첩`;
                else displayDur = typeof val === 'number' ? `${val}${statusInfo.unit || '턴'}` : "ON";
            } else if (customName) {
                name = customName;
                displayDur = typeof val === 'number' ? (key.includes('stack') ? `${val}중첩` : `${val}턴`) : "ON";
            } else continue;
        }
        entries.push({ name, duration: displayDur, icon });
    }
    return entries;
}

export function runSimulationCore(context) {
    const { charId, charData, sData, stats, turns, iterations, targetCount, manualPattern, enemyAttrIdx, defaultGrowthRate } = context;
    const br = parseInt(stats.s1 || 0), baseStats = calculateBaseStats(charData.base, parseInt(stats.lv || 1), br, parseInt(stats.s2 || 0), defaultGrowthRate);
    const iterationResults = [];
    const flow = sData.flow || ['onTurn', 'onCalculateDamage', 'onAttack', 'onEnemyHit', 'onAfterAction'];

    for (let i = 0; i < iterations; i++) {
        let simState = sData.initialState ? JSON.parse(JSON.stringify(sData.initialState)) : {};
        let total = 0, logs = [], perTurnDmg = [], stateLogs = [], detailedLogs = [], turnInfoLogs = [];
        const ultCD = (() => { const m = charData.skills[1].desc?.match(/\(쿨타임\s*:\s*(\d+)턴\)/); return m ? parseInt(m[1]) : 3; })();
        let cd = { ult: ultCD };

        for (let t = 1; t <= turns; t++) {
            const turnDebugLogs = [];
            let currentTDmg = 0;
            const actionType = manualPattern[t-1] || (cd.ult === 0 ? 'ult' : 'normal');
            const isUlt = actionType === 'ult', isDefend = actionType === 'defend';
            const skill = isUlt ? charData.skills[1] : charData.skills[0];

            if (context.customValues.enemy_hp_auto) context.customValues.enemy_hp_percent = Math.max(0, Math.floor(100 * (1 - t / turns)));

            const isAllyUltTurn = sData.isAllyUltTurn ? sData.isAllyUltTurn(t) : (t > 1 && (t - 1) % 3 === 0);
            const dynCtx = createSimulationContext({ t, turns, charId, charData, stats, simState, isUlt, targetCount, isDefend, isAllyUltTurn, customValues: context.customValues, logs, debugLogs: turnDebugLogs });

            const getLatestSubStats = () => {
                const subStats = { "기초공증": 0, "공증": 0, "고정공증": 0, "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, "속성디버프": 0, "HP증가": 0, "기초HP증가": 0, "회복증가": 0, "배리어증가": 0, "지속회복증가": 0 };
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
                return { atk: final.최종공격력, subStats };
            };

            const calculateAndLogHit = (event) => {
                const latest = getLatestSubStats();
                const coef = event.val !== undefined ? event.val : (event.max || event.fixed || event.coef || 0);
                const s = charData.skills.find(sk => sk.id === event.skillId);
                const isM = event.isMulti !== undefined ? event.isMulti : (s?.isMultiTarget || false);
                const dUnit = calculateDamage(event.type || "추가공격", latest.atk, latest.subStats, coef, false, charData.info.속성, enemyAttrIdx);
                const finalD = isM ? dUnit * targetCount : dUnit;
                currentTDmg += finalD;

                if (finalD > 0) {
                    const label = event.customTag || (s ? ( (idx=charData.skills.indexOf(s)) => (idx===0?'보통공격':idx===1?'필살기':idx<=6?`패시브${idx-1}`:'도장'))() : "추가타");
                    logs.push(`<div class="sim-log-line"><span>${t}턴: <span class="sim-log-tag">[${label}]</span> ${event.name || s?.name || "추가타"}:</span> <span class="sim-log-dmg">+${finalD.toLocaleString()}</span></div>`);
                }
                
                const effVul = latest.subStats["뎀증디버프"] + latest.subStats["속성디버프"];
                
                let typeDmg = 0; let typeLabel = "T-Dmg";
                if (event.type === "보통공격") { typeDmg = latest.subStats["평타뎀증"]; typeLabel = "N-Dmg"; }
                else if (event.type === "필살공격") { typeDmg = latest.subStats["필살기뎀증"]; typeLabel = "U-Dmg"; }
                else { typeDmg = latest.subStats["트리거뎀증"]; } 
                const typeDmgStr = typeDmg ? ` / ${typeLabel}:${typeDmg.toFixed(1)}%` : '';

                dynCtx.debugLogs.push({ type: 'action', msg: `ICON:${s?.icon || 'icon/main.png'}|[${event.customTag || "추가타"}] ${event.name || s?.name || "추가타"}: +${finalD.toLocaleString()}`, 
                    statMsg: `Coef:${(isM ? coef * targetCount : coef).toFixed(1)}% / Atk:${latest.atk.toLocaleString()}${latest.subStats["뎀증"]!==0?' / Dmg:'+latest.subStats["뎀증"].toFixed(1)+'%':''}${typeDmgStr}${effVul!==0?' / Vul:'+effVul.toFixed(1)+'%':''}` 
                });
                if (event.skillId && !event.skipTrigger) dynCtx.checkStackTriggers(event.skillId);
            };

            const processExtra = (e) => {
                if (!e || (e.condition && !dynCtx.checkCondition(e.condition))) return;
                
                if (e.type === "buff" || e.type === "hit" || e.type === "action" || e.type === "stack") {
                    if (e.type === "buff") dynCtx.applyBuff(e);
                    else if (e.type === "hit") {
                        const idx = dynCtx.getSkillIdx(e.originalId);
                        const val = e.val !== undefined ? e.val : (e.valIdx !== undefined ? dynCtx.getVal(idx, e.valIdx) : dynCtx.getVal(idx, e.valKey || '추가공격'));
                        const res = dynCtx.applyHit(e, val);
                        if (res) calculateAndLogHit({ ...res, isMulti: e.isMulti });
                    } else if (e.type === "action" && e.action === "all_consume") {
                        const key = e.stateKey || (e.id + "_stacks"); dynCtx.simState[key] = 0; dynCtx.log(e.label || key, "all_consume");
                    } else if (e.type === "stack") {
                        dynCtx.gainStack(e);
                    }
                    return;
                }
                
                if (e.skillId) {
                    const skillIdx = dynCtx.getSkillIdx(e.skillId);
                    if (skillIdx !== -1 && !dynCtx.isUnlocked(skillIdx)) return;
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
                    .sort((a, b) => (a.order || 999) - (b.order || 999)).forEach(processExtra);
            };

            const handleHook = (hook) => {
                const res = sData[hook]?.(dynCtx);
                if (res?.extraHits) res.extraHits.flat(Infinity).filter(Boolean).sort((a, b) => (a.order || 999) - (b.order || 999)).forEach(processExtra);
            };

            flow.forEach(step => {
                if (step === 'onTurn') {
                    if (context.customValues.enemy_hp_auto) turnInfoLogs.push({ enemyHp: context.customValues.enemy_hp_percent });
                    else turnInfoLogs.push({});
                    for (const key in simState) if (key.endsWith('_timer')) {
                        if (typeof simState[key] === 'number' && simState[key] > 0) simState[key]--;
                        else if (Array.isArray(simState[key])) simState[key] = simState[key].map(v => (typeof v === 'number' ? v - 1 : { ...v, dur: v.dur - 1 })).filter(v => (v.dur || v) > 0);
                    }
                    handleHook('onTurn');
                    autoExecuteParams(step);
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
                    turnDebugLogs.length = 0;
                    stateLogs.push(formatBuffState(charId, simState, charData, sData, stats));
                } else if (step === 'onCalculateDamage') {
                    handleHook('onCalculateDamage');
                    autoExecuteParams(step);
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
                    turnDebugLogs.length = 0;
                } else if (step === 'onAttack') {
                    if (isDefend) {
                        logs.push(`<div class="sim-log-line"><span>${t}턴: <span class="sim-log-tag">[방어]</span></span> <span class="sim-log-dmg">+0</span></div>`);
                        dynCtx.debugLogs.push('ICON:icon/simul.png|[방어]');
                        handleHook('onAttack');
                    } else {
                        const st = getLatestSubStats();
                        let mDmgSum = 0, mCoef = 0;
                        const targetType = isUlt ? "필살공격" : "보통공격";
                        skill.damageDeal?.forEach((e, idx) => {
                            if (e.type !== targetType && e.type !== "기초공격") return;
                            // [수정] e.val이 있으면 직접 사용(우선순위), 없으면 idx로 calc 참조(하위 호환)
                            const param = e.val ? e.val : idx;
                            const fC = dynCtx.getVal(charData.skills.indexOf(skill), param);
                            const tc = e.isSingleTarget ? 1 : targetCount;
                            mDmgSum += calculateDamage(targetType, st.atk, st.subStats, fC, isUlt && stats.stamp, charData.info.속성, enemyAttrIdx) * tc;
                            mCoef += ((isUlt && stats.stamp && e.val.stampMax) ? e.val.stampMax : e.val.max) * tc;
                        });
                        const effVul = st.subStats["뎀증디버프"] + st.subStats["속성디버프"];
                        
                        let typeDmg = 0; let typeLabel = "T-Dmg";
                        // ... (타입별 뎀증 로직은 유지) ... 
                        // 아래 old_string 매칭을 위해 원본 형태 유지 필요. 
                        // 하지만 여기서는 구조만 잡고 내용은 old_string에 맞춤.
                        const specDmgKey = isUlt ? "필살기뎀증" : "평타뎀증";
                        const specDmgVal = st.subStats[specDmgKey];
                        const specDmgStr = specDmgVal ? ` / ${isUlt?'U':'N'}-Dmg:${specDmgVal.toFixed(1)}%` : '';

                        if (mDmgSum > 0) {
                            const mainTag = `<span class="sim-log-tag">[${isUlt?'필살기':'보통공격'}]</span>`;
                            logs.push(`<div class="sim-log-line"><span>${t}턴: ${mainTag} ${skill.name}:</span> <span class="sim-log-dmg">+${mDmgSum.toLocaleString()}</span></div>`);
                            dynCtx.debugLogs.push({ type: 'action', msg: `ICON:${skill.icon}|${mainTag} ${skill.name}: +${mDmgSum.toLocaleString()}`, 
                                statMsg: `Coef:${mCoef.toFixed(1)}% / Atk:${st.atk.toLocaleString()}${st.subStats["뎀증"]!==0?' / Dmg:'+st.subStats["뎀증"].toFixed(1)+'%':''}${specDmgStr}${effVul!==0?' / Vul:'+effVul.toFixed(1)+'%':''}` 
                            });
                        }
                        currentTDmg = mDmgSum;
                        const p = simParams[charId]; if (p) { const mid = isUlt ? p.ultTrigger : p.normalTrigger; if (mid) dynCtx.checkStackTriggers(mid); }
                        handleHook('onAttack');
                    }
                    autoExecuteParams(step);
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
                    turnDebugLogs.length = 0;
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
                            // [수정] being_hit 트리거에 연결된 모든 파라미터(스택, 버프, 반격 등)를 일괄 실행
                            autoExecuteParams("being_hit");
                            handleHook('onEnemyHit');
                        }
                    }
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
                    turnDebugLogs.length = 0;
                } else if (step === 'onAfterAction') {
                    handleHook('onAfterAction');
                    autoExecuteParams(step);
                    turnDebugLogs.forEach(item => detailedLogs.push({ t, ...(typeof item === 'string' ? { type: 'debug', msg: item } : item) }));
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
    if (range > 0) for (let j = 0; j <= 5; j++) { const v = min + (range * (j / 5)); xLabels.push({ pos: (j / 5) * 100, label: v >= 1000 ? (v / 1000).toFixed(0) + 'K' : Math.floor(v) }); } 
    else xLabels.push({ pos: 50, label: min >= 1000 ? (min / 1000).toFixed(0) + 'K' : Math.floor(min) });
    return { min: min.toLocaleString(), max: max.toLocaleString(), avg: avg.toLocaleString(), logHtml: closest.logs.map(l => `<div>${l}</div>`).join(''), graphData: bins.map((c, i) => ({ h: (c / Math.max(...bins)) * 100, isAvg: (range === 0) ? (i === centerIdx) : (i === Math.floor(((closest.total - min) / range) * (binCount - 1))) })), axisData: { x: xLabels, y: Array.from({length: 6}, (_, i) => Math.floor(Math.max(...bins) * (5 - i) / 5)) }, turnData: closest.perTurnDmg, closestTotal: closest.total, closestLogs: closest.logs, closestStateLogs: closest.stateLogs, closestDetailedLogs: closest.detailedLogs, closestTurnInfoLogs: closest.turnInfoLogs, yMax: Math.max(...bins) };
}
