// hero-tab.js
import { state } from './state.js';
import { charData } from './data.js';
import { saveSnapshots } from './storage.js';

/**
 * Hero 탭(딜량 비교 그래프 및 표)을 렌더링합니다.
 */
export function renderHeroTab(dom, updateStatsCallback) {
    dom.statsArea.innerHTML = '';
    if (dom.newSectionArea) dom.newSectionArea.innerHTML = ''; 

    const snapshots = state.comparisonSnapshots || [];
    const hasSnapshots = snapshots.length > 0;

    const contentDisplay = document.getElementById('content-display');
    const oldGraph = document.getElementById('hero-graph-container');
    if (oldGraph) oldGraph.remove();

    const graphContainer = document.createElement('div');
    graphContainer.id = 'hero-graph-container';
    graphContainer.className = 'hero-graph-container';
    
    if (contentDisplay) contentDisplay.prepend(graphContainer);

    const headerTab = document.createElement('div');
    headerTab.className = 'hero-tab-tag';
    headerTab.innerHTML = `<div class="hero-tag-content">기록 중인 캐릭터 (딜량 비교)</div>`;
    graphContainer.appendChild(headerTab);

    // 테이블 슬롯 생성
    const tableContainer = document.createElement('div');
    tableContainer.id = 'hero-comparison-tables';
    tableContainer.className = 'comparison-tables-container';

    const slot1 = document.createElement('div');
    slot1.id = 'comp-slot-1';
    slot1.className = 'comparison-slot';
    slot1.style.display = 'none';

    const slot2 = document.createElement('div');
    slot2.id = 'comp-slot-2';
    slot2.className = 'comparison-slot';
    slot2.style.display = 'none';

    tableContainer.appendChild(slot1);
    tableContainer.appendChild(slot2);
    if (contentDisplay) {
        const oldTables = document.getElementById('hero-comparison-tables');
        if (oldTables) oldTables.remove();
        contentDisplay.appendChild(tableContainer);
    }

    let currentSlotTarget = state.heroComparisonState?.nextTarget || 1;

    const renderSnapshotToSlot = (snapshot, container) => {
        const charId = snapshot.charId;
        const records = snapshot.records || [];
        const charTitle = charData[charId]?.title || charId;
        const totalDmg = snapshot.totalDamage || 0;
        container.style.display = 'block';
        container.innerHTML = '';
        
        const header = document.createElement('div');
        header.style.cssText = `border-bottom: 2px solid #8b4513; padding-bottom: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;`;
        header.innerHTML = `<div style="font-weight: bold; color: #333; display: flex; align-items: center; gap: 8px;"><img src="images/${charId}.webp" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1px solid #ccc;">${charTitle}</div><div style="font-size: 0.9em; font-weight: bold; color: #d35400;">${totalDmg.toLocaleString()}</div>`;
        container.appendChild(header);
        
        if (records.length === 0) { container.innerHTML += '<div style="text-align:center; color:#999; padding:20px;">기록 없음</div>'; return; }
        
        const list = document.createElement('div');
        list.style.cssText = `font-size: 0.85em; display: flex; flex-direction: column; gap: 2px;`;
        records.forEach(rec => {
            if (rec.isTurnSeparator) {
                const sep = document.createElement('div');
                sep.className = 'turn-separator';
                sep.style.margin = '10px 0 5px'; // 비교표 내부용 미세조정
                sep.innerHTML = `<div class="turn-line" style="border-color:#eee;"></div><span class="turn-label" style="color:#ccc;">${rec.turnNumber}턴</span><div class="turn-line" style="border-color:#eee;"></div>`;
                list.appendChild(sep);
                return;
            }
            const row = document.createElement('div');
            row.style.cssText = `display: flex; justify-content: space-between; padding: 3px 5px; background: #f9f9f9; border-radius: 4px;`;
            const rawDmg = parseInt(rec.damage.replace(/,/g, '')) || 0;
            const totalRowDmg = rawDmg * (rec.count || 1);
            row.innerHTML = `<div style="color: #555;">${rec.name} ${rec.count > 1 ? `<span style="color:#ff4d4d; font-weight:bold; font-size:0.9em;">x${rec.count}</span>` : ''}</div><div style="font-weight: bold; color: #333;">${totalRowDmg.toLocaleString()}</div>`;
            list.appendChild(row);
        });
        container.appendChild(list);
    };

    const contentPadding = document.createElement('div');
    contentPadding.style.cssText = `padding: 40px 10px 10px 10px; position: relative;`;
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'snapshot-header-tools';
    headerDiv.style.cssText = `position: absolute; top: -35px; right: 10px; display: flex; justify-content: flex-end; align-items: center; z-index: 10;`;
    
    const clearAllBtn = document.createElement('button');
    clearAllBtn.textContent = '전체 기록 삭제';
    clearAllBtn.className = 'header-btn-sub'; // 향후 CSS 통합 가능
    clearAllBtn.style.cssText = `padding: 4px 12px; font-size: 0.8em; background: #fff; color: #dc3545; border: 1px solid #dc3545; border-radius: 4px; cursor: pointer; font-weight: bold;`;
    
    if (!hasSnapshots) clearAllBtn.style.display = 'none';
    clearAllBtn.onclick = () => {
        if (confirm('모든 비교 기록을 삭제하시겠습니까?')) {
            state.comparisonSnapshots = [];
            saveSnapshots([]);
            updateStatsCallback(); 
        }
    };
    headerDiv.appendChild(clearAllBtn);
    contentPadding.appendChild(headerDiv);

    if (hasSnapshots) {
        const maxTotal = Math.max(...snapshots.map(s => s.totalDamage));
        const imgGrid = document.createElement('div');
        imgGrid.className = 'graph-img-grid';
        import('./handlers.js').then(mod => mod.setupDragScroll(imgGrid));

        snapshots.forEach(snapshot => {
            const totalDmg = snapshot.totalDamage;
            const charId = snapshot.charId;
            const barHeight = maxTotal > 0 ? (totalDmg / maxTotal) * 100 : 0;
            
            const wrapper = document.createElement('div');
            wrapper.className = 'snapshot-wrapper';
            
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '×';
            deleteBtn.className = 'snapshot-del-btn';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                state.comparisonSnapshots = state.comparisonSnapshots.filter(s => s.id !== snapshot.id);
                saveSnapshots(state.comparisonSnapshots);
                updateStatsCallback();
            };
            wrapper.appendChild(deleteBtn);

            const img = document.createElement('img');
            img.src = `images/${charId}.webp`;
            img.className = 'snapshot-img';
            img.onclick = (e) => {
                e.stopPropagation();
                const targetContainer = currentSlotTarget === 1 ? slot1 : slot2;
                renderSnapshotToSlot(snapshot, targetContainer);
                if (!state.heroComparisonState) state.heroComparisonState = {};
                if (currentSlotTarget === 1) state.heroComparisonState.slot1Id = snapshot.id;
                else state.heroComparisonState.slot2Id = snapshot.id;
                currentSlotTarget = currentSlotTarget === 1 ? 2 : 1;
                state.heroComparisonState.nextTarget = currentSlotTarget;
            };
            
            const barContainer = document.createElement('div');
            barContainer.className = 'snapshot-bar-container';
            
            const bar = document.createElement('div');
            bar.className = 'snapshot-bar';
            bar.style.height = `${barHeight}px`;
            barContainer.appendChild(bar);
            
            const dmgLabel = document.createElement('div');
            dmgLabel.className = 'snapshot-dmg-label';
            const shortDmg = totalDmg >= 1000000 ? (totalDmg / 1000000).toFixed(1) + 'M' : totalDmg >= 1000 ? (totalDmg / 1000).toFixed(0) + 'K' : totalDmg;
            dmgLabel.textContent = shortDmg;
            
            wrapper.appendChild(img); wrapper.appendChild(dmgLabel); wrapper.appendChild(barContainer); imgGrid.appendChild(wrapper);
        });
        contentPadding.appendChild(imgGrid);
    } else {
        const emptyMsg = document.createElement('div');
        emptyMsg.style.cssText = `padding: 10px; text-align: center; color: #666; font-size: 1em;`;
        emptyMsg.textContent = '저장된 비교 기록이 없습니다.';
        contentPadding.appendChild(emptyMsg);
    }
    graphContainer.appendChild(contentPadding);
    
    if (state.heroComparisonState) {
        if (state.heroComparisonState.slot1Id) {
            const s1 = snapshots.find(s => s.id === state.heroComparisonState.slot1Id);
            if (s1) renderSnapshotToSlot(s1, slot1);
        }
        if (state.heroComparisonState.slot2Id) {
            const s2 = snapshots.find(s => s.id === state.heroComparisonState.slot2Id);
            if (s2) renderSnapshotToSlot(s2, slot2);
        }
    }
}

export function clearHeroTabRemnants() {
    const heroGraph = document.getElementById('hero-graph-container');
    if (heroGraph) heroGraph.remove();
    const heroTables = document.getElementById('hero-comparison-tables');
    if (heroTables) heroTables.remove();
}