// simulator.js
import { state, constants } from './state.js';
import { charData } from './data.js';
import { simCharData } from './sim_data.js';
import { calculateDamage } from './calculations.js';
import { getSkillMultiplier } from './formatter.js';

/**
 * 행동 패턴 에디터 업데이트
 */
function updateActionEditor(charId) {
    const turnsSelect = document.getElementById('sim-turns');
    const listContainer = document.getElementById('sim-action-list');
    if (!turnsSelect || !listContainer) return;
    const turns = parseInt(turnsSelect.value);
    const data = charData[charId];
    let pattern = []; try { pattern = JSON.parse(localStorage.getItem(`sim_pattern_${charId}`)) || []; } catch(e) {}
    listContainer.innerHTML = '';
    const ultSkill = data.skills[1];
    let ultCD = 3; if (ultSkill && ultSkill.desc) { const m = ultSkill.desc.match(/\(쿨타임\s*:\s*(\d+)턴\)/); if (m) ultCD = parseInt(m[1]); }
    
    const getActionColor = (val) => {
        if (val === 'ult') return 'background: #ffebee; color: #c62828; border-color: #ef9a9a;';
        if (val === 'defend') return 'background: #e3f2fd; color: #1565c0; border-color: #90caf9;';
        return 'background: #e8f5e9; color: #2e7d32; border-color: #a5d6a7;'; // normal
    };

    for (let t = 1; t <= turns; t++) {
        const row = document.createElement('div'); row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:4px;border-bottom:1px solid #eee;';
        let def = pattern[t-1] || (t > 1 && (t - 1) % ultCD === 0 ? 'ult' : 'normal');
        row.innerHTML = `<span style="font-size:0.75em;font-weight:bold;min-width:30px;color:#888;">${t}턴</span>
            <select class="sim-action-select" style="flex:1; font-size:0.8em; padding:4px; border-radius:4px; border:1px solid #ddd; font-weight:bold; ${getActionColor(def)}">
                <option value="normal" ${def==='normal'?'selected':''}>보통공격</option>
                <option value="ult" ${def==='ult'?'selected':''}>필살기</option>
                <option value="defend" ${def==='defend'?'selected':''}>방어</option>
            </select>`;
        listContainer.appendChild(row);
    }
    listContainer.querySelectorAll('.sim-action-select').forEach(sel => { 
        sel.onchange = (e) => {
            e.target.style.cssText = `flex:1; font-size:0.8em; padding:4px; border-radius:4px; border:1px solid #ddd; font-weight:bold; ${getActionColor(e.target.value)}`;
            const p = Array.from(listContainer.querySelectorAll('.sim-action-select')).map(s => s.value); 
            localStorage.setItem(`sim_pattern_${charId}`, JSON.stringify(p)); 
        }; 
    });
}

/**
 * 축 라벨 및 보조선 렌더링
 */
function renderAxisLabels(axisData, yMax, type = 'dist') {
    const yAxis = document.getElementById('sim-y-axis');
    const xAxis = document.getElementById('sim-x-axis');
    const grid = document.getElementById('sim-grid-lines');
    const isMobile = window.innerWidth <= 768;
    const gH = isMobile ? 140 : 220;

    if (yAxis && yMax) {
        yAxis.style.position = 'relative';
        yAxis.style.display = isMobile ? 'none' : 'block'; 
        if (type === 'dist') {
            yAxis.style.width = isMobile ? '20px' : '25px';
            yAxis.style.borderRight = '1px solid #eee';
            yAxis.innerHTML = axisData.y.map(val => {
                const label = val >= 10000 ? (val/1000).toFixed(0)+'K' : val.toLocaleString();
                const bp = (val / yMax) * 100;
                return `<div style="position:absolute;bottom:${bp}%;right:8px;transform:translateY(50%);white-space:nowrap;">${label}</div>`;
            }).join('');
        } else {
            yAxis.innerHTML = '';
            yAxis.style.borderRight = 'none'; 
            yAxis.style.width = isMobile ? '20px' : '25px';
        }
        if (grid) grid.innerHTML = axisData.y.map(val => val === 0 ? '' : `<div style="position:absolute;bottom:${(val/yMax)*100}%;width:100%;border-top:1px dashed #f0f0f0;"></div>`).join('');
    }
    if (xAxis) {
        xAxis.innerHTML = axisData.x.map(val => `<div style="position:absolute;left:${val.pos}%;top:0;width:0;overflow:visible;"><div style="width:1px;height:6px;background:#ddd;position:absolute;top:0;left:0;"><div style="position:absolute;bottom:6px;left:0;width:1px;height:${gH}px;border-left:1px dashed #f0f0f0;pointer-events:none;"></div></div><div style="transform:rotate(-60deg);transform-origin:right top;font-size:0.55em;color:#999;white-space:nowrap;margin-top:10px;text-align:right;width:100px;position:absolute;right:0;">${val.label}</div></div>`).join('');
    }
}

/**
 * 딜 그래프 렌더링 (에어리어 차트)
 */
function renderDamageLineChart(charId) {
    const container = document.getElementById('sim-line-graph');
    const res = JSON.parse(localStorage.getItem(`sim_last_result_${charId}`));
    if (!container || !res || !res.turnData) return;
    const isMobile = window.innerWidth <= 768;
    const gH = isMobile ? 140 : 220;
    const turnData = res.turnData;
    const maxCum = Math.max(...turnData.map(d => d.cumulative));
    const maxTrn = Math.max(...turnData.map(d => d.dmg));
    const turnCount = turnData.length;
    let html = `<svg width="100%" height="100%" viewBox="0 0 400 ${gH}" preserveAspectRatio="none" style="overflow:visible;"><defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#6f42c1" stop-opacity="0.3"/><stop offset="100%" stop-color="#6f42c1" stop-opacity="0"/></linearGradient></defs>`;
    turnData.forEach((d, i) => { const x = (i / (turnCount - 1)) * 400; const h = maxTrn ? (d.dmg / maxTrn) * (gH * 0.5) : 0; html += `<rect class="svg-bar-grow" x="${x-2}" y="${gH-h}" width="4" height="${h}" fill="#e0e0e0" rx="1" style="transform-box: fill-box;" />`; });
    let areaPath = `M 0,${gH} `; turnData.forEach((d, i) => { const x = (i / (turnCount - 1)) * 400; const y = gH - (d.cumulative / maxCum) * gH; areaPath += `L ${x},${y} `; }); areaPath += `L 400,${gH} Z`; html += `<path class="svg-bar-grow" d="${areaPath}" fill="url(#areaGrad)" style="transform-box: fill-box;" />`;
    let pts = ""; turnData.forEach((d, i) => { const x = (i / (turnCount - 1)) * 400; const y = gH - (d.cumulative / maxCum) * gH; pts += (i === 0 ? "M " : "L ") + `${x},${y} `; }); html += `<path class="svg-bar-grow" d="${pts}" fill="none" stroke="#6f42c1" stroke-width="3" stroke-opacity="0.5" stroke-linejoin="round" style="transform-box: fill-box;" />`;
    html += `</svg>`; container.innerHTML = html;
    const turnLabels = []; for (let i = 0; i < turnCount; i++) { const turnNum = i + 1; let shouldShow = (i === 0 || (turnCount >= 30 ? turnNum % 5 === 0 : (turnCount >= 16 ? turnNum % 2 === 0 : true))); if (shouldShow) turnLabels.push({ pos: (i / (turnCount - 1)) * 100, label: turnNum + '턴' }); }
    renderAxisLabels({ y: [maxCum, Math.floor(maxCum / 2), 0], x: turnLabels }, maxCum, 'line');
}

export function initSimulator() {
    const simPage = document.getElementById('simulator-page');
    const mainColumn = document.querySelector('.main-content-column');
    const contentDisplay = document.getElementById('content-display');
    if (simPage) simPage.style.setProperty('display', 'block', 'important');
    if (mainColumn) mainColumn.style.setProperty('display', 'block', 'important');
    if (contentDisplay) { contentDisplay.style.setProperty('display', 'block', 'important'); contentDisplay.classList.add('hero-mode'); }
    const container = document.getElementById('simulator-content');
    if (!container) return;
    const savedCharId = localStorage.getItem('sim_last_char_id');
    if (savedCharId && charData[savedCharId] && charData[savedCharId].base) renderSimulatorUI(savedCharId);
    else renderCharacterSelector();
}

function renderCharacterSelector() {
    localStorage.removeItem('sim_last_char_id');
    const container = document.getElementById('simulator-content');
    const validChars = Object.keys(charData).filter(id => charData[id].base && id !== 'test_dummy' && id !== 'hero');
    const disabledIds = ['beernox', 'kyrian', 'meng', 'leo'];
    container.innerHTML = `<div style="text-align: center; padding: 20px 0;"><div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 30px;"><h3 style="margin: 0; color: #333;">분석할 캐릭터를 선택하세요</h3></div><div class="sim-char-grid">${validChars.map(id => { const isDisabled = disabledIds.includes(id); const style = isDisabled ? 'filter: grayscale(100%); opacity: 0.5; pointer-events: none; cursor: default;' : ''; return `<div class="sim-char-pick-item" data-id="${id}" style="${style}"><img src="images/${id}.webp"><div class="sim-char-name">${charData[id].title}</div></div>`; }).join('')}</div></div>`;
    container.querySelectorAll('.sim-char-pick-item').forEach(item => { if (item.style.pointerEvents !== 'none') { item.onclick = () => { localStorage.setItem('sim_last_char_id', item.dataset.id); renderSimulatorUI(item.dataset.id); }; } });
}

function renderSimAttributePicker(charId) {
    const container = document.getElementById('sim-attribute-picker-container');
    if (!container) return;
    const currentAttrIdx = parseInt(localStorage.getItem(`sim_last_enemy_attr_${charId}`) || "0");
    const myAttrIdx = charData[charId]?.info?.속성 ?? -1;
    let displayIdxs = new Set(); if (myAttrIdx >= 0) { displayIdxs.add(myAttrIdx); const rels = { 0: { win: 2, lose: 1 }, 1: { win: 0, lose: 2 }, 2: { win: 1, lose: 0 }, 3: { win: 4, lose: 4 }, 4: { win: 3, lose: 3 } }; const rel = rels[myAttrIdx]; if (rel.win !== null) displayIdxs.add(rel.win); if (rel.lose !== null) displayIdxs.add(rel.lose); } displayIdxs.add(currentAttrIdx);
    let othersHtml = ''; displayIdxs.forEach(idx => { if (idx === currentAttrIdx) return; const attrName = constants.attributeList[idx]; let gc = ''; if (myAttrIdx >= 0) { const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 }; const loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 }; if (wins[myAttrIdx] === idx) gc = '#00ff00'; else if (loses[myAttrIdx] === idx) { if (myAttrIdx <= 2 && idx <= 2) gc = '#ff0000'; if ((myAttrIdx === 3 && idx === 4) || (myAttrIdx === 4 && idx === 3)) gc = '#00ff00'; } } othersHtml += `<div class="attr-control-item" style="width:24px;height:24px;margin:1px;position:relative;display:flex;align-items:center;justify-content:center;">${gc ? `<div style="position:absolute;width:14px;height:14px;background:${gc};box-shadow:0 0 8px ${gc};filter:blur(3px);opacity:0.7;transform:rotate(45deg);"></div>` : ''}<img src="${constants.attributeImageMap[constants.attributeList[idx]]}" class="sim-other-attr-icon" data-idx="${idx}" style="width:20px;height:20px;cursor:pointer;opacity:0.6;z-index:1;"></div>`; });
    const currName = constants.attributeList[currentAttrIdx]; let cgc = ''; if (myAttrIdx >= 0 && currentAttrIdx !== myAttrIdx) { const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 }; const loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 }; if (wins[myAttrIdx] === currentAttrIdx) cgc = '#00ff00'; else if (loses[myAttrIdx] === currentAttrIdx) { if (myAttrIdx <= 2 && currentAttrIdx <= 2) cgc = '#ff0000'; if ((myAttrIdx === 3 && currentAttrIdx === 4) || (myAttrIdx === 4 && currentAttrIdx === 3)) cgc = '#00ff00'; } }
    container.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;scale:0.8;"><div style="display:flex;justify-content:center;">${othersHtml}</div><div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;position:relative;">${cgc ? `<div style="position:absolute;width:24px;height:24px;background:${cgc};box-shadow:0 0 12px ${cgc};filter:blur(4px);opacity:0.8;transform:rotate(45deg);"></div>` : ''}<img src="${constants.attributeImageMap[currName]}" style="width:32px;height:32px;z-index:1;"></div></div>`;
    container.querySelectorAll('.sim-other-attr-icon').forEach(icon => { icon.onclick = () => { localStorage.setItem(`sim_last_enemy_attr_${charId}`, icon.dataset.idx); renderSimAttributePicker(charId); }; });
}

function renderSimulatorUI(charId) {
    const container = document.getElementById('simulator-content');
    const data = charData[charId], sData = simCharData[charId] || {}, stats = state.savedStats[charId] || {};
    const brText = (parseInt(stats.s1||0) < 5) ? `0성 ${parseInt(stats.s1||0)}단계` : (parseInt(stats.s1||0) < 15) ? `1성 ${parseInt(stats.s1||0)-5}단계` : (parseInt(stats.s1||0) < 30) ? `2성 ${parseInt(stats.s1||0)-15}단계` : (parseInt(stats.s1||0) < 50) ? `3성 ${parseInt(stats.s1||0)-30}단계` : (parseInt(stats.s1||0) < 75) ? `4성 ${parseInt(stats.s1||0)-50}단계` : "5성";
    const hasMulti = data.skills.some(s => s.isMultiTarget || (s.damageDeal && s.damageDeal.some(d => d.isMultiTarget || d.stampIsMultiTarget)));
    const savedTurns = localStorage.getItem('sim_last_turns') || "10", savedIters = localStorage.getItem('sim_last_iters') || "100", isMobile = window.innerWidth <= 768, gH = isMobile ? 140 : 220;
    const defaultTooltip = "외부 요인은 방어를 사용하지 않고 3턴마다 필살기를 사용합니다.", tooltipText = (sData && sData.tooltipDesc) ? sData.tooltipDesc : defaultTooltip;

    container.innerHTML = `<div style="margin-bottom:10px; display: flex; justify-content: space-between; align-items: center;"><button id="sim-back-to-list" style="background:#f0f0f0;border:1px solid #ddd;color:#666;cursor:pointer;font-size:0.8em;font-weight:bold;padding:5px 12px;border-radius:4px;">← 캐릭터 목록</button><div id="sim-info-icon" style="width: 18px; height: 18px; border-radius: 50%; border: 1px solid #999; color: #999; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; background: #fff; font-weight: bold; margin-right: 5px;">i</div></div>
        <div class="sim-main-container"><div class="sim-pane-settings"><div style="position: relative; display:flex;align-items:center;gap:10px;margin-bottom:20px;padding:12px;background:#fff;border:1px solid #eee0d0;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.05);overflow:hidden;"><img src="images/${charId}.webp" class="sim-char-profile-img" style="width:55px;height:55px;border-radius:10px;object-fit:cover;border:2px solid #6f42c1;background:black;object-position:top;flex-shrink:0;cursor:pointer;" title="캐릭터 상세 정보로 이동"><div style="flex-grow:1;display:flex;align-items:center;justify-content:space-between;min-width:0;"><div style="min-width:0;flex:1;"><div style="display:flex;align-items:center;gap:8px;"><h3 style="margin:0;font-size:1.1em;color:#333;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${data.title}</h3>${stats.stamp ? `<div style="background:black;border-radius:4px;padding:2px;display:flex;align-items:center;border:1px solid #444;flex-shrink:0;"><img src="images/sigilwebp/sigil_${charId}.webp" style="width:18px;height:18px;object-fit:contain;"></div>` : ''}</div><div style="font-size:0.75em;color:#888;margin-top:2px;">Lv.${stats.lv || 1} / ${brText} / 적합도 ${stats.s2 || 0}</div></div><div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">${hasMulti ? `<div style="display:flex;flex-direction:column;align-items:center;scale:0.9;flex-shrink:0;"><div style="font-size:0.65em;color:#888;margin-bottom:2px;">대상 수</div><button id="sim-target-btn" style="width:30px;height:30px;border-radius:50%;border:1px solid #6f42c1;background:#fff;color:#6f42c1;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;">${localStorage.getItem(`sim_last_target_${charId}`)||1}</button></div>` : ''}<div id="sim-attribute-picker-container"></div></div></div></div>
                <div id="sim-custom-controls" style="display:none;background:#fff;border:1px solid #ddd;border-radius:12px;padding:15px;margin-bottom:15px;"><div id="sim-custom-list" style="display:flex;flex-wrap:wrap;gap:10px;"></div></div>
                <div style="background:#fff;border:1px solid #ddd;border-radius:12px;padding:20px;margin-bottom:15px;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;"><div style="display:flex; flex-direction:column; gap:4px;"><label style="font-size:0.85em;font-weight:bold;color:#555;">진행 턴 수</label><div style="font-size:1.1em; font-weight:900; color:#6f42c1;"><span id="sim-turns-val">${savedTurns}</span>턴</div></div><button id="sim-edit-actions-btn" style="background:#f0f0f0;border:1px solid #ccc;border-radius:4px;font-size:0.75em;padding:4px 10px;cursor:pointer;">⚙️ 행동 수정</button></div><div id="sim-turns-slider-container" style="margin: 10px 0 25px 0; padding: 5px 0;"><input type="range" id="sim-turns" min="1" max="30" value="${savedTurns}" step="1" list="sim-turns-ticks" style="width:100%; cursor:pointer; accent-color: #6f42c1;"><datalist id="sim-turns-ticks"><option value="1"></option><option value="5"></option><option value="10"></option><option value="15"></option><option value="20"></option><option value="25"></option><option value="30"></option></datalist></div><div id="sim-action-editor" style="display:none;background:#f9f9f9;border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:15px;max-height:280px;overflow-y:auto;"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; border-bottom:1px solid #eee; padding-bottom:5px;"><span style="font-weight:bold;color:#6f42c1;font-size:0.8em;">⚙️ 행동 직접 지정</span><button id="sim-reset-pattern-btn" style="background:#fff;border:1px solid #dc3545;color:#dc3545;cursor:pointer;font-size:0.75em;font-weight:bold;padding:2px 8px;border-radius:4px;">초기화</button></div><div id="sim-action-list" style="display:flex;flex-direction:column;gap:5px;"></div></div><label style="display:block;font-size:0.85em;font-weight:bold;color:#555;margin-bottom:8px;">시뮬레이션 횟수</label><select id="sim-iterations" style="width:100%;padding:12px;border:1px solid #ccc;border-radius:8px;background:#f9f9f9;font-weight:bold;"><option value="10" ${savedIters==="10"?'selected':''}>10회</option><option value="30" ${savedIters==="30"?'selected':''}>30회</option><option value="100" ${savedIters==="100"?'selected':''}>100회</option><option value="300" ${savedIters==="300"?'selected':''}>300회</option></select></div><button id="run-simulation-btn" style="width:100%;padding:16px;background:#6f42c1;color:white;border:none;border-radius:12px;font-weight:bold;cursor:pointer;font-size:1.1em;">분석 시작 🚀</button></div>
            <div class="sim-pane-display"><div id="simulation-result-area" style="display:none;"><div style="background:#fff;border:1px solid #eee;border-radius:12px;padding:20px;margin-bottom:20px;box-shadow:0 2px 10px rgba(0,0,0,0.05);"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;"><h4 style="margin:0;color:#333;">분석 리포트</h4><div style="display:flex; gap:5px;"><button id="btn-show-dist" style="background:#6f42c1; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:0.75em; cursor:pointer;">분포도</button><button id="btn-show-dmg" style="background:#f0f0f0; color:#666; border:1px solid #ccc; padding:4px 10px; border-radius:4px; font-size:0.75em; cursor:pointer;">딜 그래프</button></div></div><div id="sim-graph-area" style="display:flex; height:${gH}px; margin-bottom:60px; padding-right:${isMobile ? '5px' : '15px'}; padding-left:0px; position:relative;"><div id="sim-y-axis" style="width: 25px; position: relative; font-size: 0.7em; color: #bbb; text-align: right; border-right: ${isMobile ? 'none' : '1px solid #eee'}; height: 100%;"></div><div style="flex: 1; display: flex; flex-direction: column; position: relative; height: 100%; border-left: ${isMobile ? '1px solid #eee' : 'none'};"><div id="sim-grid-lines" style="position: absolute; width: 100%; height: 100%; pointer-events: none; z-index: 0;"></div><div id="sim-dist-graph" style="flex: 1; display: flex; align-items: flex-end; gap: 1px; border-bottom: 1px solid #eee; position: relative; z-index: 1; height: 100%;"></div><div id="sim-line-graph" style="display:none; flex: 1; position:relative; border-bottom: 1px solid #eee; z-index: 1; overflow: visible; height: 100%;"></div><div id="sim-x-axis" style="height: 0px; position: relative; width: 100%;"></div></div></div><div style="display:grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; box-sizing: border-box;"><div style="background:#f8f9fa; padding: 10px 5px; border-radius:10px; text-align:center;"><div style="font-size: 0.65em; color:#999;">최소</div><div id="sim-min-dmg" style="font-weight:bold; font-size:${isMobile?'0.85em':'1em'};">0</div></div><div style="background:#6f42c1; padding: 10px 5px; border-radius:10px; text-align:center; color:white;"><div style="font-size: 0.65em; opacity:0.9;">평균</div><div id="sim-avg-dmg" style="font-weight: 900; font-size:${isMobile?'1em':'1.2em'};">0</div></div><div style="background:#f8f9fa; padding: 10px 5px; border-radius:10px; text-align:center;"><div style="font-size: 0.65em; color:#999;">최대</div><div id="sim-max-dmg" style="font-weight:bold; font-size:${isMobile?'0.85em':'1em'};">0</div></div></div></div><div id="sim-log" style="background:#1c2128;color:#4af626;padding:25px;border-radius:12px;font-family:monospace;max-height:400px;overflow-y:auto;line-height:1.6;"></div><div id="sim-result-actions" style="margin-top: 20px;"></div></div><div id="sim-empty-msg" style="text-align:center;padding:100px 20px;color:#bbb;border:2px dashed #eee;border-radius:15px;">분석 시작 버튼을 눌러주세요.</div></div></div>`;

    renderSimAttributePicker(charId);
    const profileImg = container.querySelector('.sim-char-profile-img');
    if (profileImg) { profileImg.onclick = () => { const navImg = document.querySelector(`.main-image[data-id="${charId}"]`); if (navImg) navImg.click(); }; }
    const infoIcon = document.getElementById('sim-info-icon');
    if (infoIcon) { import('./ui.js').then(ui => { const showTooltip = (e) => { e.stopPropagation(); const existing = document.querySelector('.buff-tooltip'); if (existing) existing.remove(); const tooltipControl = ui.showSimpleTooltip(infoIcon, tooltipText); setTimeout(() => tooltipControl.remove(), 3000); const closeOnOutside = () => { tooltipControl.remove(); document.removeEventListener('click', closeOnOutside); }; setTimeout(() => document.addEventListener('click', closeOnOutside), 50); }; infoIcon.onclick = showTooltip; infoIcon.onmouseenter = (e) => { if (!('ontouchstart' in window) && (navigator.maxTouchPoints <= 0)) { const tooltipControl = ui.showSimpleTooltip(infoIcon, tooltipText); infoIcon.addEventListener('mouseleave', tooltipControl.onMouseLeave, { once: true }); } }; }); }

    if (sData.customControls && sData.customControls.length > 0) {
        const customWrapper = document.getElementById('sim-custom-controls');
        const customList = document.getElementById('sim-custom-list');
        customWrapper.style.display = 'block'; customList.innerHTML = '';
        
        for (let i = 0; i < sData.customControls.length; i++) {
            const ctrl = sData.customControls[i];
            const nextCtrl = sData.customControls[i+1];
            const savedVal = localStorage.getItem(`sim_custom_${charId}_${ctrl.id}`);
            
            // HP + 자동 체크박스 묶음 특수 레이아웃 (다른 박스와 동일한 1/3 크기)
            if (ctrl.id === 'enemy_hp' && nextCtrl && nextCtrl.id === 'auto_hp') {
                const group = document.createElement('div');
                group.style.cssText = `display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8f9fa; padding:8px 5px; border-radius:8px; border:1px solid #eee; flex: 0 0 calc(33.33% - 10px); min-width:80px; box-sizing:border-box;`;
                const label = document.createElement('span'); label.style.cssText = `font-size:0.6em; color:#888; font-weight:bold; margin-bottom:4px; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;`; label.textContent = "적 HP (%)";
                const row = document.createElement('div'); row.style.cssText = `display:flex; align-items:center; gap:5px;`;
                
                const autoSaved = (localStorage.getItem(`sim_custom_${charId}_${nextCtrl.id}`) === 'true');
                
                const input = document.createElement('input'); input.type = 'number'; input.min = 0; input.max = 100; 
                input.value = parseInt(savedVal) || ctrl.initial || 0;
                input.disabled = autoSaved;
                input.style.cssText = `width:38px; padding:2px; border:1px solid #6f42c1; border-radius:4px; text-align:center; font-weight:bold; outline:none; font-size:0.8em; opacity: ${autoSaved ? '0.5' : '1'};`;
                input.onchange = () => { let val = Math.max(0, Math.min(100, parseInt(input.value) || 0)); input.value = val; localStorage.setItem(`sim_custom_${charId}_${ctrl.id}`, val); };
                
                const checkWrapper = document.createElement('label'); checkWrapper.style.cssText = `display:flex; align-items:center; gap:2px; font-size:0.65em; font-weight:bold; color:#666; cursor:pointer;`;
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = autoSaved;
                checkbox.style.cssText = `width:12px; height:12px; cursor:pointer; margin:0;`;
                checkbox.onchange = (e) => {
                    const checked = e.target.checked;
                    localStorage.setItem(`sim_custom_${charId}_${nextCtrl.id}`, checked);
                    input.disabled = checked;
                    input.style.opacity = checked ? '0.5' : '1';
                };
                
                checkWrapper.appendChild(checkbox); checkWrapper.appendChild(document.createTextNode("자동"));
                row.appendChild(input); row.appendChild(checkWrapper); group.appendChild(label); group.appendChild(row); customList.appendChild(group);
                i++; continue;
            }

            const item = document.createElement('div');
            item.style.cssText = `display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f8f9fa; padding:8px 5px; border-radius:8px; border:1px solid #eee; flex: 0 0 calc(33.33% - 10px); min-width:80px; box-sizing:border-box;`;
            const label = document.createElement('span'); label.style.cssText = `font-size:0.65em; color:#888; font-weight:bold; margin-bottom:4px; text-align:center; width:100%;`; label.textContent = ctrl.label;
            const ctrlElement = document.createElement('div');
            if (ctrl.type === 'input') {
                const input = document.createElement('input'); input.type = 'number'; input.value = parseInt(savedVal) || ctrl.initial || 0;
                input.style.cssText = `width:50px; padding:3px; border:1px solid #6f42c1; border-radius:4px; text-align:center; font-weight:bold; outline:none;`;
                input.onchange = () => { localStorage.setItem(`sim_custom_${charId}_${ctrl.id}`, input.value); }; ctrlElement.appendChild(input);
            } else if (ctrl.type === 'toggle') {
                const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = (savedVal === 'true' || (savedVal === null && ctrl.initial === true));
                checkbox.style.cssText = `width:16px; height:16px; cursor:pointer;`;
                checkbox.onchange = (e) => { localStorage.setItem(`sim_custom_${charId}_${ctrl.id}`, e.target.checked); }; ctrlElement.appendChild(checkbox);
            } else {
                const btn = document.createElement('button'); btn.style.cssText = `background:#fff; border:1px solid #6f42c1; color:#6f42c1; font-weight:bold; font-size:0.9em; padding:4px 12px; border-radius:20px; cursor:pointer; min-width:40px;`;
                btn.textContent = parseInt(savedVal) || ctrl.initial || 0;
                btn.onclick = () => { let next = parseInt(btn.textContent) + 1; if (next > ctrl.max) next = ctrl.min; btn.textContent = next; localStorage.setItem(`sim_custom_${charId}_${ctrl.id}`, next); }; ctrlElement.appendChild(btn);
            }
            item.appendChild(label); item.appendChild(ctrlElement); customList.appendChild(item);
        }
    }

    const btnDist = document.getElementById('btn-show-dist'), btnDmg = document.getElementById('btn-show-dmg'), distView = document.getElementById('sim-dist-graph'), dmgView = document.getElementById('sim-line-graph');
    const styleId = 'sim-bar-animation'; if (!document.getElementById(styleId)) { const style = document.createElement('style'); style.id = styleId; style.innerHTML = `@keyframes barGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } } .bar-grow-item { transform-origin: bottom; animation: barGrow 0.5s ease-out forwards; } .svg-bar-grow { transform-origin: bottom; animation: barGrow 0.5s ease-out forwards; }`; document.head.appendChild(style); }
    const switchGraph = (mode) => { const res = JSON.parse(localStorage.getItem(`sim_last_result_${charId}`)); if (!res) return; if (mode === 'dist') { distView.style.display = 'flex'; dmgView.style.display = 'none'; distView.innerHTML = res.graphData.map((b, i) => `<div class="bar-grow-item" style="flex:1; height:${b.h}%; background:${(b.isAvg===true||b.isAvg==="true")?'#6f42c1':'#e0e0e0'}; border-radius:0px; position:relative; z-index:2;"></div>`).join(''); btnDist.style.cssText = 'background:#6f42c1; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:0.75em; cursor:pointer;'; btnDmg.style.cssText = 'background:#f0f0f0; color:#666; border:1px solid #ccc; padding:4px 10px; border-radius:4px; font-size:0.75em; cursor:pointer;'; renderAxisLabels(res.axisData, res.yMax, 'dist'); } else { distView.style.display = 'none'; dmgView.style.display = 'block'; btnDmg.style.cssText = 'background:#6f42c1; color:white; border:none; padding:4px 10px; border-radius:4px; font-size:0.75em; cursor:pointer;'; btnDist.style.cssText = 'background:#f0f0f0; color:#666; border:1px solid #ccc; padding:4px 10px; border-radius:4px; font-size:0.75em; cursor:pointer;'; renderDamageLineChart(charId); } };
    btnDist.onclick = () => switchGraph('dist'); btnDmg.onclick = () => switchGraph('dmg');
    const savedRes = localStorage.getItem(`sim_last_result_${charId}`); if (savedRes) { try { const res = JSON.parse(savedRes); document.getElementById('sim-empty-msg').style.display='none'; document.getElementById('simulation-result-area').style.display='block'; document.getElementById('sim-min-dmg').innerText=res.min; document.getElementById('sim-max-dmg').innerText=res.max; document.getElementById('sim-avg-dmg').innerText=res.avg; document.getElementById('sim-log').innerHTML=res.logHtml; const distGraph = document.getElementById('sim-dist-graph'); distGraph.innerHTML = res.graphData.map(b => `<div style="flex:1; height:${b.h}%; background:${(b.isAvg===true||b.isAvg==="true")?'#6f42c1':'#e0e0e0'}; border-radius:0px; position:relative; z-index:2;"></div>`).join(''); renderAxisLabels(res.axisData, res.yMax, 'dist'); renderHeroTabButton(charId, res.closestTotal, res.closestLogs, stats); } catch(e) {} }
    const turnsInput = document.getElementById('sim-turns'), turnsValDisplay = document.getElementById('sim-turns-val'); if (turnsInput) { turnsInput.oninput = (e) => { let val = parseInt(e.target.value); if (turnsValDisplay) turnsValDisplay.innerText = val; localStorage.setItem('sim_last_turns', val); updateActionEditor(charId); }; }
    document.getElementById('sim-iterations').onchange = (e) => localStorage.setItem('sim_last_iters', e.target.value);
    document.getElementById('sim-back-to-list').onclick = () => { localStorage.removeItem(`sim_last_result_${charId}`); renderCharacterSelector(); };
    if (hasMulti) { document.getElementById('sim-target-btn').onclick = (e) => { let c = (parseInt(e.target.innerText)%5)+1; e.target.innerText=c; localStorage.setItem(`sim_last_target_${charId}`,c); }; }
    document.getElementById('sim-edit-actions-btn').onclick = () => { const ed = document.getElementById('sim-action-editor'); ed.style.display = (ed.style.display==='block')?'none':'block'; if(ed.style.display==='block') updateActionEditor(charId); };
    document.getElementById('sim-reset-pattern-btn').onclick = () => { if (confirm('패턴을 초기화하시겠습니까?')) { localStorage.removeItem(`sim_pattern_${charId}`); updateActionEditor(charId); } };
    document.getElementById('run-simulation-btn').onclick = () => { document.getElementById('sim-empty-msg').style.display='none'; runSimulation(charId); };
    window.onresize = () => { if (document.getElementById('simulation-result-area').style.display === 'block') renderSimulatorUI(charId); };
}

/**
 * Hero 탭에 표 추가 버튼 렌더링
 */
function renderHeroTabButton(charId, total, logs, stats) {
    const actionsArea = document.getElementById('sim-result-actions');
    if (!actionsArea) return;
    actionsArea.innerHTML = '';
    const addBtn = document.createElement('button');
    addBtn.innerHTML = '<span style="font-size:1.2em; margin-right:5px;">+</span> 비교탭에 표 추가';
    addBtn.style.cssText = 'width:100%; padding:15px; background:#6f42c1; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size:0.9em; box-shadow:0 4px 10px rgba(111, 66, 193, 0.2);';
    addBtn.onclick = () => {
        const convertedRecords = [];
        let lastLoggedTurn = 0;
        logs.forEach((log) => {
            const turnMatch = log.match(/^(\d+)턴:/);
            if (turnMatch) {
                const currentTurn = parseInt(turnMatch[1]);
                if (currentTurn > lastLoggedTurn) {
                    convertedRecords.push({ isTurnSeparator: true, turnNumber: currentTurn });
                    lastLoggedTurn = currentTurn;
                }
            }
            const typeM = log.match(/\[(.*?)\]/);
            const nameM = log.match(/\]\s+(.*?)(?::|\s\+)/);
            const dmgM = log.match(/\+([\d,]+)/);
            if (dmgM) { 
                let skillName = (nameM ? nameM[1].trim() : "스킬");
                skillName = skillName.replace(/\[전의:\d+\]/g, "").trim();
                convertedRecords.push({ name: skillName, damage: dmgM[1], type: (typeM ? typeM[1] : "기타"), count: 1, isTurnSeparator: false }); 
            }
            else if (log.includes('[방어]')) { convertedRecords.push({ name: "방어", damage: "0", type: "방어", count: 1, isTurnSeparator: false }); }
        });
        const newSnapshot = { id: Date.now(), charId: charId, timestamp: new Date().toISOString(), totalDamage: total, records: convertedRecords, stats: { lv: stats.lv || 1, s1: parseInt(stats.s1 || 0), s2: parseInt(stats.s2 || 0) } };
        state.comparisonSnapshots.push(newSnapshot);
        import('./storage.js').then(mod => mod.saveSnapshots(state.comparisonSnapshots));
        addBtn.innerHTML = '✓ 비교탭에 추가되었습니다'; addBtn.style.background = '#6f42c1';
        setTimeout(() => { addBtn.innerHTML = '<span style="font-size:1.2em; margin-right:5px;">+</span> 비교탭에 표 추가'; addBtn.style.background = '#6f42c1'; }, 2000);
    };
    actionsArea.appendChild(addBtn);
}

function runSimulation(charId) {
    const turnsSelect = document.getElementById('sim-turns');
    const itersSelect = document.getElementById('sim-iterations');
    if (!turnsSelect || !itersSelect) return;
    const turns = parseInt(turnsSelect.value);
    const iterations = parseInt(itersSelect.value);
    const data = charData[charId], sData = simCharData[charId] || {};
    const targetCount = parseInt(document.getElementById('sim-target-btn')?.innerText || "1");
    const enemyAttrIdx = parseInt(localStorage.getItem(`sim_last_enemy_attr_${charId}`) || "0");
    const myAttrIdx = data.info?.속성;
    let manualPattern = []; try { manualPattern = JSON.parse(localStorage.getItem(`sim_pattern_${charId}`)) || []; } catch(e) { manualPattern = []; }
    const customValues = {}; 
    if (sData.customControls) {
        sData.customControls.forEach(c => { 
            const rawVal = localStorage.getItem(`sim_custom_${charId}_${c.id}`);
            if (c.type === 'toggle') { customValues[c.id] = (rawVal === 'true' || (rawVal === null && c.initial === true)); }
            else { customValues[c.id] = parseInt(rawVal) || c.initial || 0; }
        });
    }
    const stats = state.savedStats[charId] || {};
    const lvVal = parseInt(stats.lv || 1);
    const brVal = parseInt(stats.s1 || 0);
    const fitVal = parseInt(stats.s2 || 0);
    const pureBaseAtk = data.base["공격력"] * Math.pow(constants.defaultGrowth, (lvVal - 1));
    const bonus1Rate = brVal * 0.02; 
    const bonus2Rate = fitVal * 0.04;
    const fitBaseAtk = Math.floor(pureBaseAtk * (1 + bonus1Rate) * (1 + bonus2Rate));
    const passiveStats = { "기초공증": 0, "공증": 0, "고정공증": 0, "뎀증": 0, "평타뎀증": 0, "필살기뎀증": 0, "트리거뎀증": 0, "뎀증디버프": 0, "속성디버프": 0, "HP증가": 0, "기초HP증가": 0, "회복증가": 0, "배리어증가": 0, "지속회복증가": 0 };
    data.skills.forEach((s, idx) => {
        const th = [0, 0, 0, 0, 30, 50, 75]; if (idx >= 4 && idx <= 6 && brVal < th[idx]) return;
        if (!s.hasToggle && !s.hasCounter && !s.customLink && data.defaultBuffSkills?.includes(s.id) && s.buffEffects) {
            const sLv = stats.skills?.[`s${idx+1}`] || 1; const sRate = getSkillMultiplier(sLv, s.startRate || 0.6);
            for (const k in s.buffEffects) { if (passiveStats.hasOwnProperty(k)) { const ef = s.buffEffects[k]; let valToAdd = 0; if (typeof ef === 'object' && ef !== null) { let baseMax = ef.max; if (ef.targetAttribute !== undefined && myAttrIdx === ef.targetAttribute && ef.attributeMax !== undefined) { baseMax = ef.attributeMax; } valToAdd = (baseMax !== undefined ? baseMax * sRate : ef.fixed) || 0; } else { valToAdd = ef || 0; } passiveStats[k] += valToAdd; } }
        }
    });
    const iterationResults = [];
    const ultSkill = data.skills[1]; let ultCD = 3; if (ultSkill.desc) { const m = ultSkill.desc.match(/\(쿨타임\s*:\s*(\d+)턴\)/); if (m) ultCD = parseInt(m[1]); }
    for (let i = 0; i < iterations; i++) {
        let total = 0; let cd = { ult: ultCD }; let simState = { battleSpirit: 0, afterDefendTurns: 0, p2_timer: 0, p3_timer: 0, choi_passive3_ready: false }; const logs = []; const perTurnDmg = [];
        for (let t = 1; t <= turns; t++) {
            if (sData.onTurn) sData.onTurn({ t, turns, charId, charData: data, stats, simState, customValues });
            const action = manualPattern.length >= t ? manualPattern[t-1] : (cd.ult === 0 ? 'ult' : 'normal');
            const isUlt = (action === 'ult'), isDefend = (action === 'defend');
            const skill = isUlt ? ultSkill : data.skills[0], sLv = isUlt ? (stats.skills?.s2 || 1) : (stats.skills?.s1 || 1), isStamped = isUlt && stats.stamp;
            let tDmg = 0;
            if (isDefend) { logs.push(`${t}턴: [방어] - +0`); } else {
                let dynamicBonus = { extraHits: [] }; if (sData.onCalculateDamage) dynamicBonus = sData.onCalculateDamage({ t, turns, isUlt, charData: data, stats, simState, customValues, targetCount }) || { extraHits: [] };
                const totalAtk = Math.floor(Math.floor(fitBaseAtk * (1 + (passiveStats["기초공증"] || 0) / 100)) * (1 + (passiveStats["공증"] || 0) / 100) + (passiveStats["고정공증"] || 0));
                                const dynD = (typeof dynamicBonus === 'object') ? (dynamicBonus["뎀증"] || 0) : 0;
                                const dynU = (typeof dynamicBonus === 'object') ? (dynamicBonus["필살기뎀증"] || 0) : 0;
                                const dynP = (typeof dynamicBonus === 'object') ? (dynamicBonus["평타뎀증"] || 0) : 0;
                                const dynT = (typeof dynamicBonus === 'object') ? (dynamicBonus["트리거뎀증"] || 0) : 0;
                                const dynDebuff = (typeof dynamicBonus === 'object') ? (dynamicBonus["뎀증디버프"] || 0) : 0;
                                const dynAttr = (typeof dynamicBonus === 'object') ? (dynamicBonus["속성디버프"] || 0) : 0;
                                const dynFixed = (typeof dynamicBonus === 'object') ? (dynamicBonus["고정공증"] || 0) : 0;
                
                                let mainDmg = 0;
                                if (skill.damageDeal && !dynamicBonus.skipMainDamage) {
                                    skill.damageDeal.forEach(entry => {
                                        const coef = (isStamped && entry.val.stampMax !== undefined) ? entry.val.stampMax : entry.val.max;
                                        if (coef === undefined || coef === null) return;
                                        const finalCoef = parseFloat((coef * getSkillMultiplier(sLv, skill.startRate || 0.6)).toFixed(skill.decimalPlaces || 2));
                                        
                                        // [수정] 실시간 고정공증(dynFixed) 반영
                                        const currentTotalAtk = Math.floor(Math.floor(fitBaseAtk * (1 + (passiveStats["기초공증"] || 0) / 100)) * (1 + (passiveStats["공증"] || 0) / 100) + (passiveStats["고정공증"] || 0) + dynFixed);
                                        
                                        let baseD = (currentTotalAtk * (finalCoef / 100)) * (1 + ((passiveStats["뎀증"] || 0) + dynD) / 100);
                                        baseD = baseD * (1 + (((isUlt ? (passiveStats["필살기뎀증"] || 0) + dynU : (passiveStats["평타뎀증"] || 0) + dynP)) / 100)) * (1 + ((passiveStats["뎀증디버프"] || 0) + dynDebuff) / 100) * (1 + ((passiveStats["속성디버프"] || 0) + dynAttr) / 100);
                                        let mult = 1.0; if (myAttrIdx !== undefined) { const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 }; const loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 }; if (wins[myAttrIdx] === enemyAttrIdx) mult = 1.5; else if (loses[myAttrIdx] === enemyAttrIdx) { if (myAttrIdx <= 2 && enemyAttrIdx <= 2) mult = 0.75; if ((myAttrIdx === 3 && enemyAttrIdx === 4) || (myAttrIdx === 4 && enemyAttrIdx === 3)) mult = 1.5; } }
                                        let hitDmg = Math.floor(baseD * mult); if ((entry.isMultiTarget ?? (isStamped ? entry.stampIsMultiTarget : skill.isMultiTarget)) && !entry.isSingleTarget) hitDmg *= targetCount;
                                        mainDmg += (hitDmg || 0);
                                    });
                                    logs.push(`${t}턴: [${isUlt ? '필살기' : '보통공격'}] ${skill.name} +${mainDmg.toLocaleString()}`);
                                }
                                tDmg = mainDmg;
                                if (dynamicBonus && dynamicBonus.extraHits) {
                                    dynamicBonus.extraHits.forEach(extra => {
                                        const currentTotalAtk = Math.floor(Math.floor(fitBaseAtk * (1 + (passiveStats["기초공증"] || 0) / 100)) * (1 + (passiveStats["공증"] || 0) / 100) + (passiveStats["고정공증"] || 0) + dynFixed);
                                        const extraBaseD = (currentTotalAtk * ((extra.coef || 0) / 100)) * (1 + ((passiveStats["뎀증"] || 0) + dynD) / 100) * (1 + (((passiveStats["트리거뎀증"] || 0) + dynT) / 100)) * (1 + ((passiveStats["뎀증디버프"] || 0) + dynDebuff) / 100) * (1 + ((passiveStats["속성디버프"] || 0) + dynAttr) / 100);
                                        let mult = 1.0; if (myAttrIdx !== undefined) { const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 }; const loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 }; if (wins[myAttrIdx] === enemyAttrIdx) mult = 1.5; else if (loses[myAttrIdx] === enemyAttrIdx) { if (myAttrIdx <= 2 && enemyAttrIdx <= 2) mult = 0.75; if ((myAttrIdx === 3 && enemyAttrIdx === 4) || (myAttrIdx === 4 && enemyAttrIdx === 3)) mult = 1.5; } }
                                        let extraFinalDmg = Math.floor(extraBaseD * mult); if (extra.isMulti) extraFinalDmg *= targetCount;
                        let autoType = extra.type || '추가타';
                        let skillName = extra.name || '추가타';
                        
                        if (extra.skillId) {
                            // 현재 캐릭터(data)의 스킬 목록에서 검색
                            const skillObj = data.skills.find(s => s.id === extra.skillId);
                            if (skillObj) {
                                skillName = skillObj.name; 
                                const sIdx = data.skills.indexOf(skillObj);
                                const getLabel = (idx) => { if (idx === 0) return "보통공격"; if (idx === 1) return "필살기"; if (idx >= 2 && idx <= 6) return `패시브${idx - 1}`; return "도장"; };
                                autoType = getLabel(sIdx);
                                if (skillObj.syncLevelWith) {
                                    const tIdx = data.skills.findIndex(s => s.id === skillObj.syncLevelWith);
                                    if (tIdx !== -1) autoType = getLabel(tIdx);
                                }
                            }
                        }

                        tDmg += (extraFinalDmg || 0);
                        logs.push(`${t}턴: [${autoType}] ${skillName} +${(extraFinalDmg || 0).toLocaleString()}`);
                    });
                }
            }
            total += tDmg; perTurnDmg.push({ dmg: tDmg, cumulative: total });
            if (sData.onAfterAction) sData.onAfterAction({ t, turns, isUlt, isDefend, stats, simState, customValues });
            if (isUlt) cd.ult = ultCD - 1; else if (cd.ult > 0) cd.ult--;
        }
        iterationResults.push({ total, logs, perTurnDmg });
    }
    const totals = iterationResults.map(d => d.total);
    const avg = Math.floor(totals.reduce((a, b) => a + b, 0) / iterations);
    const min = Math.min(...totals), max = Math.max(...totals), closest = iterationResults.reduce((prev, curr) => Math.abs(curr.total - avg) < Math.abs(prev.total - avg) ? curr : prev);
    const range = max - min;
    
    // [수정] 300회일 때도 가독성을 위해 구간(bins) 개수를 최대 100개로 제한
    const binCount = Math.min(iterations, 100);
    const bins = new Array(binCount).fill(0);
    let targetBinIdx = -1; 
    
    iterationResults.forEach((res, idx) => { 
        let bIdx = (range === 0) ? Math.floor(binCount / 2) : Math.floor(((res.total - min) / range) * binCount); 
        if (bIdx >= binCount) bIdx = binCount - 1; 
        bins[bIdx]++; 
        if (res === closest && targetBinIdx === -1) targetBinIdx = bIdx; 
    });
    const maxFreq = Math.max(...bins); let yStep = (maxFreq <= 9) ? 1 : (maxFreq < 30 ? 2 : (maxFreq < 100 ? 5 : 20));
    const yMax = (maxFreq % yStep === 0) ? (maxFreq === 0 ? yStep : maxFreq) : (Math.floor(maxFreq / yStep) + 1) * yStep;
    const yLabels = []; for (let v = 0; v <= yMax; v += yStep) yLabels.push(v); yLabels.reverse();
    const axisData = { y: yLabels, x: [] }; for (let i = 0; i <= 10; i++) { const v = min + (range / 10) * i; const label = v >= 10000 ? (v/1000).toFixed(0)+'K' : Math.floor(v).toLocaleString(); axisData.x.push({ pos: i * 10, label: label }); }
    const resultToSave = { min: min.toLocaleString(), max: max.toLocaleString(), avg: avg.toLocaleString(), logHtml: closest.logs.map(l => `<div>${l}</div>`).join(''), graphData: bins.map((c, i) => ({ h: (c / yMax) * 100, isAvg: i === targetBinIdx, count: c })), axisData, yMax, turnData: closest.perTurnDmg, closestTotal: closest.total, closestLogs: closest.logs };
    localStorage.setItem(`sim_last_result_${charId}`, JSON.stringify(resultToSave));
    document.getElementById('sim-min-dmg').innerText = resultToSave.min;
    document.getElementById('sim-avg-dmg').innerText = resultToSave.avg;
    document.getElementById('sim-max-dmg').innerText = resultToSave.max;
    document.getElementById('sim-log').innerHTML = resultToSave.logHtml;
    document.getElementById('simulation-result-area').style.display = 'block';
    document.getElementById('sim-empty-msg').style.display = 'none';
    const isLineMode = document.getElementById('sim-line-graph').style.display === 'block';
    if (isLineMode) { renderDamageLineChart(charId); } else {
        const distGraph = document.getElementById('sim-dist-graph');
        distGraph.innerHTML = resultToSave.graphData.map((b, i) => `<div class="bar-grow-item" style="flex:1; height:${b.h}%; background:${b.isAvg ? '#6f42c1' : '#e0e0e0'}; border-radius:0px; position:relative; z-index:2;"></div>`).join('');
        renderAxisLabels(axisData, yMax, 'dist');
    }
    renderHeroTabButton(charId, closest.total, closest.logs, stats);
}
