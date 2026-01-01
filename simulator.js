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
    
    const actions = [
        { id: 'normal', label: '보통', activeStyle: 'background:#e8f5e9; color:#2e7d32; border-color:#a5d6a7;' },
        { id: 'defend', label: '방어', activeStyle: 'background:#e3f2fd; color:#1565c0; border-color:#90caf9;' },
        { id: 'ult', label: '필살', activeStyle: 'background:#ffebee; color:#c62828; border-color:#ef9a9a;' }
    ];

    for (let t = 1; t <= turns; t++) {
        const currentAction = pattern[t-1] || (t > 1 && (t - 1) % CD === 0 ? 'ult' : 'normal');
        const row = document.createElement('div'); 
        row.style.cssText = 'display:flex; align-items:center; gap:10px; padding:8px 0; border-bottom:1px solid #eee;';
        
        let html = `<span style="font-size:0.75em; font-weight:bold; min-width:30px; color:#888;">${t}턴</span>`;
        html += `<div style="display:flex; flex:1; gap:4px;">`;
        
        actions.forEach(act => {
            const isActive = currentAction === act.id;
            const style = isActive ? act.activeStyle : 'background:#f5f5f5; color:#bbb; border-color:#ddd;';
            html += `<button class="sim-action-btn" data-turn="${t-1}" data-value="${act.id}" style="flex:1; font-size:0.75em; padding:6px 0; border-radius:6px; border:1px solid; font-weight:bold; cursor:pointer; transition:all 0.1s; ${style}">${act.label}</button>`;
        });
        
        html += `</div>`;
        row.innerHTML = html;
        listContainer.appendChild(row);
    }

    // 클릭 이벤트 리스너
    listContainer.querySelectorAll('.sim-action-btn').forEach(btn => {
        btn.onclick = (e) => {
            const turnIdx = parseInt(btn.dataset.turn);
            const newValue = btn.dataset.value;
            
            // 패턴 업데이트 및 저장
            const currentPattern = Array.from({ length: turns }, (_, i) => {
                const activeBtn = listContainer.querySelector(`.sim-action-btn[data-turn="${i}"][style*="background: rgb"]`) || 
                                 listContainer.querySelector(`.sim-action-btn[data-turn="${i}"][style*="background:#"]`);
                // 버튼 스타일로 체크하는 것보다 현재 클릭한 버튼을 반영한 새 배열을 만드는게 안전
                let p = JSON.parse(localStorage.getItem(`sim_pattern_${charId}`)) || [];
                // 만약 빈 배열이면 기본값들로 채워줘야함
                if (p.length === 0) {
                    for(let k=0; k<turns; k++) p[k] = (k > 0 && k % CD === 0) ? 'ult' : 'normal';
                }
                p[turnIdx] = newValue;
                return p;
            })[0]; // 로직상 첫번째 실행에서 완성됨

            localStorage.setItem(`sim_pattern_${charId}`, JSON.stringify(currentPattern));
            
            // UI 즉시 갱신 (해당 턴의 버튼들만 다시 그리기)
            const siblingBtns = btn.parentElement.querySelectorAll('.sim-action-btn');
            siblingBtns.forEach(sBtn => {
                const act = actions.find(a => a.id === sBtn.dataset.value);
                const isActive = sBtn === btn;
                sBtn.style.cssText = `flex:1; font-size:0.75em; padding:6px 0; border-radius:6px; border:1px solid; font-weight:bold; cursor:pointer; transition:all 0.1s; ${isActive ? act.activeStyle : 'background:#f5f5f5; color:#bbb; border-color:#ddd;'}`;
            });
        };
    });
}

/**
 * 시각화 로직 (유지)
 */
function renderAxisLabels(axisData, yMax, type = 'dist') {
    const yAxis = document.getElementById('sim-y-axis'), xAxis = document.getElementById('sim-x-axis'), grid = document.getElementById('sim-grid-lines');
    if (yAxis && yMax) {
        yAxis.innerHTML = type === 'dist' ? axisData.y.map(val => { const label = val >= 10000 ? (val/1000).toFixed(0)+'K' : val.toLocaleString(); const bp = (val / yMax) * 100; return `<div style="position:absolute;bottom:${bp}%;right:8px;transform:translateY(50%);white-space:nowrap;">${label}</div>`; }).join('') : '';
        if (grid) grid.innerHTML = axisData.y.map(val => val === 0 ? '' : `<div style="position:absolute;bottom:${(val/yMax)*100}%;width:100%;border-top:1px dashed #e0e0e0;"></div>`).join('');
    }
    if (xAxis) {
        xAxis.innerHTML = axisData.x.map(val => `<div style="position:absolute;left:${val.pos}%;top:0;width:0;overflow:visible;"><div style="width:1px;height:6px;background:#ddd;position:absolute;top:0;left:0;"><div style="position:absolute;bottom:6px;left:0;width:1px;height:220px;border-left:1px dashed #f0f0f0;pointer-events:none;"></div></div><div style="transform:rotate(-60deg);transform-origin:right top;font-size:0.55em;color:#999;white-space:nowrap;margin-top:10px;text-align:right;width:100px;position:absolute;right:0;">${val.label}</div></div>`).join('');
    }
}

function renderDamageLineChart(charId) {
    const container = document.getElementById('sim-line-graph'), res = JSON.parse(localStorage.getItem(`sim_last_result_${charId}`));
    if (!container || !res) return;
    const turnData = res.turnData, maxCum = Math.max(...turnData.map(d => d.cumulative)), maxTrn = Math.max(...turnData.map(d => d.dmg)), turnCount = turnData.length;
    let html = `<svg width="100%" height="100%" viewBox="0 0 400 220" preserveAspectRatio="none" style="overflow:visible;"><defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6f42c1" stop-opacity="0.3"/><stop offset="100%" stop-color="#6f42c1" stop-opacity="0"/></linearGradient></defs>`;
    
    turnData.forEach((d, i) => { 
        const x = turnCount > 1 ? (i / (turnCount - 1)) * 400 : 0; 
        const h = maxTrn > 0 ? (d.dmg / maxTrn) * 110 : 0; 
        html += `<rect class="svg-bar-grow" x="${x-2}" y="${220-h}" width="4" height="${h}" fill="#e0e0e0" rx="1" />`; 
    });
    
    let areaPath = `M 0,220 `; 
    turnData.forEach((d, i) => { 
        const x = turnCount > 1 ? (i / (turnCount - 1)) * 400 : 0; 
        const y = maxCum > 0 ? 220 - (d.cumulative / maxCum) * 220 : 220; 
        areaPath += `L ${x},${y} `; 
    }); 
    areaPath += `L ${turnCount > 1 ? 400 : 0},220 Z`; 
    html += `<path class="svg-bar-grow" d="${areaPath}" fill="url(#areaGrad)" />`;
    
    let pts = ""; 
    turnData.forEach((d, i) => { 
        const x = turnCount > 1 ? (i / (turnCount - 1)) * 400 : 0; 
        const y = maxCum > 0 ? 220 - (d.cumulative / maxCum) * 220 : 220; 
        pts += (i === 0 ? "M " : "L ") + `${x},${y} `; 
    }); 
    html += `<path class="svg-bar-grow" d="${pts}" fill="none" stroke="#6f42c1" stroke-width="3" stroke-opacity="0.5" />`;
    
    container.innerHTML = html + `</svg>`;
    const turnLabels = []; 
    for (let i = 0; i < turnCount; i++) { 
        const turnNum = i + 1; 
        if (i === 0 || (turnCount >= 30 ? turnNum % 5 === 0 : (turnCount >= 16 ? turnNum % 2 === 0 : true))) {
            const pos = turnCount > 1 ? (i / (turnCount - 1)) * 100 : 0;
            turnLabels.push({ pos, label: turnNum + '턴' }); 
        }
    }
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
    const container = document.getElementById('simulator-content'), 
          validChars = Object.keys(charData).filter(id => charData[id].base && id !== 'hero' && id !== 'test_dummy');
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
    const useHitProb = sData.useHitProb || false;

    container.innerHTML = getSimulatorLayoutHtml(charId, data, stats, brText, hasMulti, savedTurns, savedIters, useHitProb);

    renderSimAttributePicker(charId);
    container.querySelector('.sim-char-profile-img').onclick = () => document.querySelector(`.main-image[data-id="${charId}"]`)?.click();
    const infoIcon = document.getElementById('sim-info-icon');
    if (infoIcon) { 
        const tooltipText = sData.tooltipDesc || "아군은 3턴의 필살기를 가지며 방어를 사용하지 않는다고 가정합니다.";
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

    const savedRes = localStorage.getItem(`sim_last_result_${charId}`); 
    if (savedRes) { 
        try { 
            const res = JSON.parse(savedRes); 
            document.getElementById('simulation-result-area').style.display='block'; 
            document.getElementById('sim-empty-msg').style.display='none'; 
            document.getElementById('sim-min-dmg').innerText=res.min; 
            document.getElementById('sim-avg-dmg').innerText=res.avg; 
            document.getElementById('sim-max-dmg').innerText=res.max; 
            document.getElementById('sim-log').innerHTML=res.logHtml; 
            
            // [추가] 그래프 막대 복구
            const distGraph = document.getElementById('sim-dist-graph');
            if (distGraph && res.graphData) {
                distGraph.innerHTML = res.graphData.map(b => `<div class="bar-grow-item" style="flex:1; height:${b.h}%; background:${b.isAvg ? '#6f42c1' : '#e0e0e0'};"></div>`).join('');
            }
            // [추가] 축 라벨 복구
            renderAxisLabels(res.axisData, res.yMax, 'dist'); 
            renderActionButtons(charId, res, stats); 
        } catch(e) { console.error('결과 복구 실패:', e); } 
    }
    document.getElementById('sim-turns').oninput = (e) => { document.getElementById('sim-turns-val').innerText = e.target.value; localStorage.setItem('sim_last_turns', e.target.value); updateActionEditor(charId); };
    document.getElementById('sim-iterations').onchange = (e) => localStorage.setItem('sim_last_iters', e.target.value);
    
    const hitProbInput = document.getElementById('sim-hit-prob');
    if (hitProbInput) hitProbInput.onchange = (e) => localStorage.setItem('sim_last_hit_prob', e.target.value);

    document.getElementById('sim-back-to-list').onclick = () => renderCharacterSelector();
    if (hasMulti) document.getElementById('sim-target-btn').onclick = (e) => { let c = (parseInt(e.target.innerText)%5)+1; e.target.innerText=c; localStorage.setItem(`sim_last_target_${charId}`,c); };
    document.getElementById('sim-edit-actions-btn').onclick = () => { const ed = document.getElementById('sim-action-editor'); ed.style.display = ed.style.display==='block' ? 'none' : 'block'; if(ed.style.display==='block') updateActionEditor(charId); };
    document.getElementById('sim-reset-pattern-btn').onclick = () => { if (confirm('패턴을 초기화하시겠습니까?')) { localStorage.removeItem(`sim_pattern_${charId}`); updateActionEditor(charId); } };
    document.getElementById('run-simulation-btn').onclick = () => runSimulation(charId);

    // [추가] 분포도 / 딜 그래프 전환 버튼 이벤트 연결
    const btnDist = document.getElementById('btn-show-dist');
    const btnDmg = document.getElementById('btn-show-dmg');
    const distGraph = document.getElementById('sim-dist-graph');
    const lineGraph = document.getElementById('sim-line-graph');

    if (btnDist && btnDmg) {
        btnDist.onclick = () => {
            btnDist.style.background = '#6f42c1'; btnDist.style.color = 'white';
            btnDmg.style.background = '#f0f0f0'; btnDmg.style.color = '#666';
            if (distGraph) distGraph.style.display = 'flex';
            if (lineGraph) lineGraph.style.display = 'none';
            
            // [추가] 분포도로 돌아갈 때 저장된 최신 결과로 축 라벨 갱신
            const lastRes = JSON.parse(localStorage.getItem(`sim_last_result_${charId}`));
            if (lastRes && lastRes.axisData) {
                renderAxisLabels(lastRes.axisData, lastRes.yMax, 'dist');
            }
        };
        btnDmg.onclick = () => {
            btnDmg.style.background = '#6f42c1'; btnDmg.style.color = 'white';
            btnDist.style.background = '#f0f0f0'; btnDist.style.color = '#666';
            if (distGraph) distGraph.style.display = 'none';
            if (lineGraph) { 
                lineGraph.style.display = 'block'; 
                renderDamageLineChart(charId); 
            }
        };
    }
}

function runSimulation(charId) {
    const runBtn = document.getElementById('run-simulation-btn');
    if (!runBtn) return;

    // [추가] 로딩 상태 표시
    const originalText = runBtn.innerHTML;
    runBtn.disabled = true;
    runBtn.innerHTML = '<span class="spinner"></span> 분석 중...';

    // 브라우저가 스피너를 렌더링할 시간을 준 뒤 계산 시작
    setTimeout(() => {
        const data = charData[charId], sData = simCharData[charId] || {}, stats = state.savedStats[charId] || {};
        const turns = parseInt(document.getElementById('sim-turns').value), iterations = parseInt(document.getElementById('sim-iterations').value);
        const targetCount = parseInt(document.getElementById('sim-target-btn')?.innerText || "1");
        const enemyAttrIdx = parseInt(localStorage.getItem(`sim_last_enemy_attr_${charId}`) || String(data.info?.속성 ?? 0));
        
        // [추가] 피격 확률 읽기 (기본값 30)
        const hitProb = sData.useHitProb ? parseInt(localStorage.getItem('sim_last_hit_prob') || "30") : 0;

        const customValues = {}; if (sData.customControls) sData.customControls.forEach(c => { const v = localStorage.getItem(`sim_custom_${charId}_${c.id}`); customValues[c.id] = c.type === 'toggle' ? (v === 'true') : (parseInt(v) || c.initial || 0); });

        const result = runSimulationCore({ charId, charData: data, sData, stats, turns, iterations, targetCount, manualPattern: JSON.parse(localStorage.getItem(`sim_pattern_${charId}`)) || [], enemyAttrIdx, customValues, defaultGrowthRate: constants.defaultGrowth, hitProb });
        
        localStorage.setItem(`sim_last_result_${charId}`, JSON.stringify(result));
        
        // [추가] 분석 시작 시 기존 그래프 및 버튼 상태를 '분포도' 기준으로 리셋
        const btnDist = document.getElementById('btn-show-dist');
        const btnDmg = document.getElementById('btn-show-dmg');
        if (btnDist && btnDmg) {
            btnDist.style.background = '#6f42c1'; btnDist.style.color = 'white';
            btnDmg.style.background = '#f0f0f0'; btnDmg.style.color = '#666';
        }
        const distGraph = document.getElementById('sim-dist-graph'); 
        const lineGraph = document.getElementById('sim-line-graph');
        if (distGraph) distGraph.style.display = 'flex';
        if (lineGraph) lineGraph.style.display = 'none';

        document.getElementById('simulation-result-area').style.display = 'block';
        document.getElementById('sim-min-dmg').innerText = result.min; 
        document.getElementById('sim-avg-dmg').innerText = result.avg; 
        document.getElementById('sim-max-dmg').innerText = result.max; 
        document.getElementById('sim-log').innerHTML = result.logHtml;
        
        document.getElementById('sim-empty-msg').style.display = 'none';
        renderActionButtons(charId, result, stats);
        
        distGraph.innerHTML = result.graphData.map(b => `<div class="bar-grow-item" style="flex:1; height:${b.h}%; background:${b.isAvg ? '#6f42c1' : '#e0e0e0'};"></div>`).join('');
        
        // 새 분석 결과에 맞는 축 라벨 렌더링
        renderAxisLabels(result.axisData, result.yMax, 'dist');

        // [추가] 로딩 상태 해제
        runBtn.disabled = false;
        runBtn.innerHTML = originalText;
    }, 10);
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
