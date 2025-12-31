// simulator.js
import { state, constants } from './state.js';
import { charData } from './data.js';
import { simCharData } from './sim_data.js';
import { runSimulationCore } from './simulator-engine.js';
import { getCharacterSelectorHtml, getSimulatorLayoutHtml, showDetailedLogModal } from './simulator-ui.js';

/**
 * 행동 패턴 에디터 업데이트
 */
function updateActionEditor(charId) {
    const turnsSelect = document.getElementById('sim-turns'), listContainer = document.getElementById('sim-action-list');
    if (!turnsSelect || !listContainer) return;
    const turns = parseInt(turnsSelect.value), data = charData[charId];
    let pattern = []; try { pattern = JSON.parse(localStorage.getItem(`sim_pattern_${charId}`)) || []; } catch(e) {}
    listContainer.innerHTML = '';
    const CD = (() => { const m = data.skills[1].desc?.match(/\(쿨타임\s*:\s*(\d+)턴\)/); return m ? parseInt(m[1]) : 3; })();
    
    const getColor = (v) => v === 'ult' ? 'background:#ffebee;color:#c62828;border-color:#ef9a9a;' : (v === 'defend' ? 'background:#e3f2fd;color:#1565c0;border-color:#90caf9;' : 'background:#e8f5e9;color:#2e7d32;border-color:#a5d6a7;');

    for (let t = 1; t <= turns; t++) {
        const def = pattern[t-1] || (t > 1 && (t - 1) % CD === 0 ? 'ult' : 'normal');
        const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px;border-bottom:1px solid #eee;';
        row.innerHTML = `<span style="font-size:0.75em;font-weight:bold;min-width:30px;color:#888;">${t}턴</span>
            <select class="sim-action-select" style="flex:1; font-size:0.8em; padding:4px; border-radius:4px; border:1px solid #ddd; font-weight:bold; ${getColor(def)}">
                <option value="normal" ${def==='normal'?'selected':''}>보통공격</option>
                <option value="ult" ${def==='ult'?'selected':''}>필살기</option>
                <option value="defend" ${def==='defend'?'selected':''}>방어</option>
            </select>`;
        listContainer.appendChild(row);
    }
    listContainer.querySelectorAll('.sim-action-select').forEach(sel => { 
        sel.onchange = (e) => { e.target.style.cssText = `flex:1; font-size:0.8em; padding:4px; border-radius:4px; border:1px solid #ddd; font-weight:bold; ${getColor(e.target.value)}`; const p = Array.from(listContainer.querySelectorAll('.sim-action-select')).map(s => s.value); localStorage.setItem(`sim_pattern_${charId}`, JSON.stringify(p)); }; 
    });
}

/**
 * 시각화 로직 (유지)
 */
function renderAxisLabels(axisData, yMax, type = 'dist') {
    const yAxis = document.getElementById('sim-y-axis'), xAxis = document.getElementById('sim-x-axis'), grid = document.getElementById('sim-grid-lines');
    if (yAxis && yMax) {
        yAxis.innerHTML = type === 'dist' ? axisData.y.map(val => { const label = val >= 10000 ? (val/1000).toFixed(0)+'K' : val.toLocaleString(); const bp = (val / yMax) * 100; return `<div style="position:absolute;bottom:${bp}%;right:8px;transform:translateY(50%);white-space:nowrap;">${label}</div>`; }).join('') : '';
        if (grid) grid.innerHTML = axisData.y.map(val => val === 0 ? '' : `<div style="position:absolute;bottom:${(val/yMax)*100}%;width:100%;border-top:1px dashed #f0f0f0;"></div>`).join('');
    }
    if (xAxis) xAxis.innerHTML = axisData.x.map(val => `<div style="position:absolute;left:${val.pos}%;top:0;width:0;overflow:visible;"><div style="width:1px;height:6px;background:#ddd;position:absolute;top:0;left:0;"><div style="position:absolute;bottom:6px;left:0;width:1px;height:220px;border-left:1px dashed #f0f0f0;pointer-events:none;"></div></div><div style="transform:rotate(-60deg);transform-origin:right top;font-size:0.55em;color:#999;white-space:nowrap;margin-top:10px;text-align:right;width:100px;position:absolute;right:0;">${val.label}</div></div>`).join('');
}

function renderDamageLineChart(charId) {
    const container = document.getElementById('sim-line-graph'), res = JSON.parse(localStorage.getItem(`sim_last_result_${charId}`));
    if (!container || !res) return;
    const turnData = res.turnData, maxCum = Math.max(...turnData.map(d => d.cumulative)), maxTrn = Math.max(...turnData.map(d => d.dmg)), turnCount = turnData.length;
    let html = `<svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none" style="overflow:visible;"><defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6f42c1" stop-opacity="0.3"/><stop offset="100%" stop-color="#6f42c1" stop-opacity="0"/></linearGradient></defs>`;
    turnData.forEach((d, i) => { const x = (i / (turnCount - 1)) * 400; const h = maxTrn ? (d.dmg / maxTrn) * 110 : 0; html += `<rect class="svg-bar-grow" x="${x-2}" y="${220-h}" width="4" height="${h}" fill="#e0e0e0" rx="1" />`; });
    let areaPath = `M 0,220 `; turnData.forEach((d, i) => { const x = (i / (turnCount - 1)) * 400; const y = 220 - (d.cumulative / maxCum) * 220; areaPath += `L ${x},${y} `; }); areaPath += `L 400,220 Z`; html += `<path class="svg-bar-grow" d="${areaPath}" fill="url(#areaGrad)" />`;
    let pts = ""; turnData.forEach((d, i) => { const x = (i / (turnCount - 1)) * 400; const y = 220 - (d.cumulative / maxCum) * 220; pts += (i === 0 ? "M " : "L ") + `${x},${y} `; }); html += `<path class="svg-bar-grow" d="${pts}" fill="none" stroke="#6f42c1" stroke-width="3" stroke-opacity="0.5" />`;
    container.innerHTML = html + `</svg>`;
    const turnLabels = []; for (let i = 0; i < turnCount; i++) { const turnNum = i + 1; if (i === 0 || (turnCount >= 30 ? turnNum % 5 === 0 : (turnCount >= 16 ? turnNum % 2 === 0 : true))) turnLabels.push({ pos: (i / (turnCount - 1)) * 100, label: turnNum + '턴' }); }
    renderAxisLabels({ y: [maxCum, Math.floor(maxCum / 2), 0], x: turnLabels }, maxCum, 'line');
}

export function initSimulator() {
    const simPage = document.getElementById('simulator-page'), mainColumn = document.querySelector('.main-content-column'), contentDisplay = document.getElementById('content-display');
    if (simPage) simPage.style.setProperty('display', 'block', 'important'); if (mainColumn) mainColumn.style.setProperty('display', 'block', 'important');
    if (contentDisplay) { contentDisplay.style.setProperty('display', 'block', 'important'); contentDisplay.classList.add('hero-mode'); }
    const container = document.getElementById('simulator-content'); if (!container) return;
    const savedCharId = localStorage.getItem('sim_last_char_id'); if (savedCharId && charData[savedCharId]?.base) renderSimulatorUI(savedCharId); else renderCharacterSelector();
}

function renderCharacterSelector() {
    localStorage.removeItem('sim_last_char_id');
    const container = document.getElementById('simulator-content'), validChars = Object.keys(charData).filter(id => charData[id].base && id !== 'hero');
    const disabledIds = constants.disabledSimChars;
    container.innerHTML = getCharacterSelectorHtml(validChars, disabledIds, charData);
    container.querySelectorAll('.sim-char-pick-item').forEach(item => { if (item.style.pointerEvents !== 'none') item.onclick = () => { localStorage.setItem('sim_last_char_id', item.dataset.id); renderSimulatorUI(item.dataset.id); }; });
}

function renderSimAttributePicker(charId) {
    const container = document.getElementById('sim-attribute-picker-container'); if (!container) return;
    const myAttrIdx = charData[charId]?.info?.속성 ?? 0, currentAttrIdx = parseInt(localStorage.getItem(`sim_last_enemy_attr_${charId}`) || String(myAttrIdx));
    let displayIdxs = new Set([myAttrIdx, currentAttrIdx]); const rels = { 0: [2, 1], 1: [0, 2], 2: [1, 0], 3: [4, 4], 4: [3, 3] };
    if (rels[myAttrIdx]) rels[myAttrIdx].forEach(idx => displayIdxs.add(idx));
    
    let othersHtml = ''; displayIdxs.forEach(idx => {
        if (idx === currentAttrIdx) return;
        const attrName = constants.attributeList[idx]; let gc = '';
        const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 }, loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 };
        if (wins[myAttrIdx] === idx) gc = '#00ff00'; else if (loses[myAttrIdx] === idx) gc = (myAttrIdx <= 2 && idx <= 2) ? '#ff0000' : '#00ff00';
        othersHtml += `<div class="attr-control-item" style="width:24px;height:24px;margin:1px;position:relative;display:flex;align-items:center;justify-content:center;">${gc ? `<div style="position:absolute;width:14px;height:14px;background:${gc};box-shadow:0 0 8px ${gc};filter:blur(3px);opacity:0.7;transform:rotate(45deg);"></div>` : ''}<img src="${constants.attributeImageMap[attrName]}" class="sim-other-attr-icon" data-idx="${idx}" style="width:20px;height:20px;cursor:pointer;opacity:0.6;z-index:1;"></div>`;
    });
    const currName = constants.attributeList[currentAttrIdx]; let cgc = ''; if (myAttrIdx >= 0 && currentAttrIdx !== myAttrIdx) { const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 }, loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 }; if (wins[myAttrIdx] === currentAttrIdx) cgc = '#00ff00'; else if (loses[myAttrIdx] === currentAttrIdx) cgc = (myAttrIdx <= 2 && currentAttrIdx <= 2) ? '#ff0000' : '#00ff00'; }
    container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;scale:0.8;"><div style="display:flex;justify-content:center;">${othersHtml}</div><div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;position:relative;">${cgc ? `<div style="position:absolute;width:24px;height:24px;background:${cgc};box-shadow:0 0 12px ${cgc};filter:blur(4px);opacity:0.8;transform:rotate(45deg);"></div>` : ''}<img src="${constants.attributeImageMap[currName]}" style="width:32px;height:32px;z-index:1;"></div></div>`;
    container.querySelectorAll('.sim-other-attr-icon').forEach(icon => { icon.onclick = () => { localStorage.setItem(`sim_last_enemy_attr_${charId}`, icon.dataset.idx); renderSimAttributePicker(charId); }; });
}

function renderSimulatorUI(charId) {
    const container = document.getElementById('simulator-content'), data = charData[charId], sData = simCharData[charId] || {}, stats = state.savedStats[charId] || {};
    const brVal = parseInt(stats.s1||0), brText = (brVal < 5) ? `0성 ${brVal}단계` : (brVal < 15) ? `1성 ${brVal-5}단계` : (brVal < 30) ? `2성 ${brVal-15}단계` : (brVal < 50) ? `3성 ${brVal-30}단계` : (brVal < 75) ? `4성 ${brVal-50}단계` : "5성";
    const hasMulti = data.skills.some(s => s.isMultiTarget || (s.damageDeal && s.damageDeal.some(d => d.isMultiTarget || d.stampIsMultiTarget)));
    const savedTurns = localStorage.getItem('sim_last_turns') || "10", savedIters = localStorage.getItem('sim_last_iters') || "100";

    container.innerHTML = getSimulatorLayoutHtml(charId, data, stats, brText, hasMulti, savedTurns, savedIters);

    renderSimAttributePicker(charId);
    container.querySelector('.sim-char-profile-img').onclick = () => document.querySelector(`.main-image[data-id="${charId}"]`)?.click();
    const infoIcon = document.getElementById('sim-info-icon');
    if (infoIcon) { 
        const tooltipText = sData.tooltipDesc || "외부 요인은 방어를 사용하지 않고 3턴마다 필살기를 사용합니다.";
        infoIcon.onclick = (e) => { e.stopPropagation(); import('./ui.js').then(ui => { const control = ui.showSimpleTooltip(infoIcon, tooltipText); setTimeout(() => control.remove(), 3000); }); };
    }

    if (sData.customControls) {
        const wrapper = document.getElementById('sim-custom-controls'), list = document.getElementById('sim-custom-list');
        wrapper.style.display = 'block'; list.innerHTML = '';
        sData.customControls.forEach(ctrl => {
            const savedVal = localStorage.getItem(`sim_custom_${charId}_${ctrl.id}`);
            const item = document.createElement('div'); item.style.cssText = `display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8f9fa; padding:8px 5px; border-radius:8px; border:1px solid #eee; flex: 0 0 calc(33.33% - 10px); min-width:80px; box-sizing:border-box;`;
            item.innerHTML = `<span style="font-size:0.65em; color:#888; font-weight:bold; margin-bottom:4px; text-align:center; width:100%;">${ctrl.label}</span>`;
            const ctrlEl = document.createElement('div');
            if (ctrl.type === 'input') { const input = document.createElement('input'); input.type = 'number'; input.value = parseInt(savedVal) || ctrl.initial || 0; input.style.cssText = `width:60px; padding:4px; border:1px solid #6f42c1; border-radius:4px; text-align:center; font-weight:bold; outline:none;`; input.onchange = () => localStorage.setItem(`sim_custom_${charId}_${ctrl.id}`, input.value); ctrlEl.appendChild(input); }
            else if (ctrl.type === 'toggle') { const check = document.createElement('input'); check.type = 'checkbox'; check.checked = (savedVal === 'true' || (savedVal === null && ctrl.initial === true)); check.onchange = (e) => localStorage.setItem(`sim_custom_${charId}_${ctrl.id}`, e.target.checked); ctrlEl.appendChild(check); }
            else { const btn = document.createElement('button'); btn.style.cssText = `background:#fff; border:1px solid #6f42c1; color:#6f42c1; font-weight:bold; font-size:0.9em; padding:4px 12px; border-radius:20px; cursor:pointer; min-width:40px;`; btn.textContent = parseInt(savedVal) || ctrl.initial || 0; btn.onclick = () => { let next = parseInt(btn.textContent) + 1; if (next > ctrl.max) next = ctrl.min; btn.textContent = next; localStorage.setItem(`sim_custom_${charId}_${ctrl.id}`, next); }; ctrlEl.appendChild(btn); }
            item.appendChild(ctrlEl); list.appendChild(item);
        });
    }

    const savedRes = localStorage.getItem(`sim_last_result_${charId}`); if (savedRes) { try { const res = JSON.parse(savedRes); document.getElementById('simulation-result-area').style.display='block'; document.getElementById('sim-empty-msg').style.display='none'; document.getElementById('sim-min-dmg').innerText=res.min; document.getElementById('sim-avg-dmg').innerText=res.avg; document.getElementById('sim-max-dmg').innerText=res.max; document.getElementById('sim-log').innerHTML=res.logHtml; renderAxisLabels(res.axisData, res.yMax, 'dist'); renderActionButtons(charId, res, stats); } catch(e) {} }
    document.getElementById('sim-turns').oninput = (e) => { document.getElementById('sim-turns-val').innerText = e.target.value; localStorage.setItem('sim_last_turns', e.target.value); updateActionEditor(charId); };
    document.getElementById('sim-iterations').onchange = (e) => localStorage.setItem('sim_last_iters', e.target.value);
    document.getElementById('sim-back-to-list').onclick = () => renderCharacterSelector();
    if (hasMulti) document.getElementById('sim-target-btn').onclick = (e) => { let c = (parseInt(e.target.innerText)%5)+1; e.target.innerText=c; localStorage.setItem(`sim_last_target_${charId}`,c); };
    document.getElementById('sim-edit-actions-btn').onclick = () => { const ed = document.getElementById('sim-action-editor'); ed.style.display = ed.style.display==='block' ? 'none' : 'block'; if(ed.style.display==='block') updateActionEditor(charId); };
    document.getElementById('sim-reset-pattern-btn').onclick = () => { if (confirm('패턴을 초기화하시겠습니까?')) { localStorage.removeItem(`sim_pattern_${charId}`); updateActionEditor(charId); } };
    document.getElementById('run-simulation-btn').onclick = () => runSimulation(charId);
}

function runSimulation(charId) {
    const data = charData[charId], sData = simCharData[charId] || {}, stats = state.savedStats[charId] || {};
    const turns = parseInt(document.getElementById('sim-turns').value), iterations = parseInt(document.getElementById('sim-iterations').value);
    const targetCount = parseInt(document.getElementById('sim-target-btn')?.innerText || "1");
    const enemyAttrIdx = parseInt(localStorage.getItem(`sim_last_enemy_attr_${charId}`) || String(data.info?.속성 ?? 0));
    
    const customValues = {}; if (sData.customControls) sData.customControls.forEach(c => { const v = localStorage.getItem(`sim_custom_${charId}_${c.id}`); customValues[c.id] = c.type === 'toggle' ? (v === 'true') : (parseInt(v) || c.initial || 0); });

    const result = runSimulationCore({ charId, charData: data, sData, stats, turns, iterations, targetCount, manualPattern: JSON.parse(localStorage.getItem(`sim_pattern_${charId}`)) || [], enemyAttrIdx, customValues, defaultGrowthRate: constants.defaultGrowth });
    
    localStorage.setItem(`sim_last_result_${charId}`, JSON.stringify(result));
    document.getElementById('sim-min-dmg').innerText = result.min; document.getElementById('sim-avg-dmg').innerText = result.avg; document.getElementById('sim-max-dmg').innerText = result.max; document.getElementById('sim-log').innerHTML = result.logHtml;
    document.getElementById('simulation-result-area').style.display = 'block'; document.getElementById('sim-empty-msg').style.display = 'none';
    renderActionButtons(charId, result, stats);
    const distGraph = document.getElementById('sim-dist-graph'); distGraph.innerHTML = result.graphData.map(b => `<div class="bar-grow-item" style="flex:1; height:${b.h}%; background:${b.isAvg ? '#6f42c1' : '#e0e0e0'};"></div>`).join('');
    renderAxisLabels(result.axisData || { y: [100, 50, 0], x: [] }, 100, 'dist');
}

function renderActionButtons(charId, result, stats) {
    const actionsArea = document.getElementById('sim-result-actions'); if (!actionsArea) return;
    actionsArea.innerHTML = ''; actionsArea.style.cssText = 'display: flex; gap: 8px; margin-top: 10px;';
    
    const addBtn = document.createElement('button'); addBtn.innerHTML = '<span style="font-size:1.1em; margin-right:3px;">+</span> 비교탭 추가'; addBtn.className = 'sim-action-btn-main';
    addBtn.style.cssText = 'flex: 1; padding: 12px; background: #6f42c1; color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 0.85em;';
    addBtn.onclick = () => {
        const recs = []; let lastT = 0;
        result.closestLogs.forEach(log => {
            const m = log.match(/^(\d+)턴:/); if (m && parseInt(m[1]) > lastT) { recs.push({ isTurnSeparator: true, turnNumber: (lastT = parseInt(m[1])) }); }
            const typeM = log.match(/\[(.*?)\]/), nameM = log.match(/\]\s+(.*?)(?::|\s\+)/), dmgM = log.match(/\+([\d,]+)/);
            if (dmgM) recs.push({ name: (nameM ? nameM[1].trim() : "스킬").replace(/\[전의:\d+\]/g, ""), damage: dmgM[1], type: (typeM ? typeM[1] : "기타"), count: 1, isTurnSeparator: false });
            else if (log.includes('[방어]')) recs.push({ name: "방어", damage: "0", type: "방어", count: 1, isTurnSeparator: false });
        });
        state.comparisonSnapshots.push({ id: Date.now(), charId, timestamp: new Date().toISOString(), totalDamage: result.closestTotal, records: recs, stats: { lv: stats.lv || 1, s1: parseInt(stats.s1 || 0), s2: parseInt(stats.s2 || 0) } });
        import('./storage.js').then(mod => mod.saveSnapshots(state.comparisonSnapshots));
        addBtn.innerHTML = '✓ 추가됨'; addBtn.style.background = '#28a745'; setTimeout(() => { addBtn.innerHTML = '+ 비교탭 추가'; addBtn.style.background = '#6f42c1'; }, 2000);
    };

    const detailBtn = document.createElement('button'); detailBtn.innerHTML = '🔍 상세 로그 분석';
    detailBtn.style.cssText = 'flex: 1; padding: 12px; background: #fff; border: 1px solid #6f42c1; color: #6f42c1; border-radius: 10px; font-size: 0.85em; font-weight: bold; cursor: pointer;';
    detailBtn.onclick = () => showDetailedLogModal(result);
    
    actionsArea.appendChild(addBtn); actionsArea.appendChild(detailBtn);
}
