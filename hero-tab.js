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
        
        // 스펙 정보 문자열 생성
        let specTextHtml = "";
        
        // 기본 폰트 크기 설정
        let nameFontSize = "0.95em";
        let specFontSize = "0.72em";

        if (snapshot.stats) {
            const { lv, s1, s2 } = snapshot.stats;
            
            // 돌파 수치를 게임 내 표기 방식으로 변환
            let brText = "";
            if (s1 >= 75) brText = "5성";
            else if (s1 >= 50) brText = `4성 ${s1 - 50}단계`;
            else if (s1 >= 30) brText = `3성 ${s1 - 30}단계`;
            else if (s1 >= 15) brText = `2성 ${s1 - 15}단계`;
            else if (s1 >= 5)  brText = `1성 ${s1 - 5}단계`;
            else brText = `0성 ${s1}단계`;

            const specContent = `Lv.${lv} / ${brText} / 적합도 ${s2}`;
            
            // [추가] 태블릿 구간(601~1099px) 자동 폰트 조절 로직
            const winWidth = window.innerWidth;
            if (winWidth > 600 && winWidth < 1100) {
                const totalLen = charTitle.length + specContent.length;
                // 길이가 길어지면 폰트 축소 (임계값 26자로 하향 조정)
                if (totalLen > 26) {
                    nameFontSize = "0.7em";
                    specFontSize = "0.55em";
                } else if (totalLen > 20) {
                    nameFontSize = "0.85em";
                    specFontSize = "0.65em";
                }
            }

            // 한 줄로 표기
            specTextHtml = `<span class="comp-spec" style="font-size:${specFontSize};">${specContent}</span>`;
        }

        container.style.display = 'block';
        container.innerHTML = '';
        
        const header = document.createElement('div');
        header.className = 'comp-header';
        
        // [수정] 이름과 스펙을 한 줄(flex-direction: row)로 배치 + 동적 폰트 적용
        header.innerHTML = `
            <div class="comp-char-info">
                <img src="images/${charId}.webp" class="comp-char-img">
                <div class="comp-text-wrapper">
                    <span class="comp-name" style="font-size: ${nameFontSize};">${charTitle}</span>
                    ${specTextHtml}
                </div>
            </div>
            <div class="comp-total-dmg">${totalDmg.toLocaleString()}</div>
        `;
        container.appendChild(header);
        
        if (records.length === 0) { container.innerHTML += '<div style="text-align:center; color:#999; padding:20px;">기록 없음</div>'; return; }
        
        const list = document.createElement('div');
        list.className = 'comp-record-list';
        records.forEach(rec => {
            if (rec.isTurnSeparator) {
                const sep = document.createElement('div');
                sep.className = 'turn-separator';
                sep.style.margin = '10px 0 5px'; // 비교표 내부용 미세조정
                sep.innerHTML = `<div class="turn-line"></div><span class="turn-label">${rec.turnNumber}턴</span><div class="turn-line"></div>`;
                list.appendChild(sep);
                return;
            }
            const row = document.createElement('div');
            row.className = 'comp-record-row';
            const rawDmg = parseInt(rec.damage.replace(/,/g, '')) || 0;
            const totalRowDmg = rawDmg * (rec.count || 1);
            
            // [수정] 타입 라벨 표시 추가
            const typeTag = rec.type ? `<span style="color:#999; margin-right:4px;">[${rec.type}]</span>` : '';
            
            row.innerHTML = `<div class="comp-record-name">${typeTag}${rec.name} ${rec.count > 1 ? `<span class="comp-record-count">x${rec.count}</span>` : ''}</div><div class="comp-record-val">${totalRowDmg.toLocaleString()}</div>`;
            list.appendChild(row);
        });
        container.appendChild(list);
    };

    const contentPadding = document.createElement('div');
    contentPadding.className = 'hero-content-padding';
    
    const headerDiv = document.createElement('div');
    headerDiv.className = 'snapshot-header-tools';
    
    const clearAllBtn = document.createElement('button');
    clearAllBtn.textContent = '전체 기록 삭제';
    clearAllBtn.className = 'header-btn-sub'; 
    
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
        emptyMsg.style.cssText = `padding: 10px; text-align: center; color: #666; font-size: 1em;`; // 간단한 건 유지하되 추후 이동 가능
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