// detail-view.js
import { state, constants } from './state.js';
import { charData } from './data.js'; // 추가
import { BREAKTHROUGH_THRESHOLDS } from './breakthrough.js';
import { recordCurrentDamage, renderDamageRecords } from './records.js';

/**
 * 상세 정보창(중간 섹션) 업데이트
 */
export function updateSkillDetailDisplay(skill, idx, dom, logic) {
    const detailDisplay = dom.newSectionArea.querySelector('.skill-detail-display');
    if (!detailDisplay) return;

    const headerIconStyle = (idx === 7) ? 'passive-max' : '';

    detailDisplay.innerHTML = `
        <div class="skill-detail-tab-tag">
            <div class="skill-detail-tab-content">스킬 데미지 계산</div>
        </div>
        <div class="skill-detail-header-row">
            <div class="skill-detail-icon-wrapper">
                <div class="skill-detail-icon-column">
                    <img src="${skill.icon}" class="skill-detail-main-icon ${headerIconStyle}">
                    <button class="record-add-btn" title="데미지 기록 추가">+</button>
                </div>
            </div>
            <div class="skill-detail-text-col">
                <div class="skill-detail-type-label"></div>
                <h3 class="skill-detail-title">${skill.name} <span class="skill-detail-level-span"></span></h3>
                <p class="skill-detail-damage-val"></p>
            </div>
            <div id="attribute-container-${state.currentId}" class="attribute-container"></div>
        </div>
        <div style="height: 5px;"></div>
    `;

    setupAttributeControl(state.currentId, logic);
    
    // [확실한 복구] 상세 정보 큰 아이콘 및 '+' 버튼 클릭 이벤트
    setTimeout(() => {
        const bigIcon = detailDisplay.querySelector('.skill-detail-main-icon');
        const plusBtn = detailDisplay.querySelector('.record-add-btn');
        
        if (bigIcon) {
            bigIcon.style.cursor = 'default';
            // 클릭 이벤트 제거
            bigIcon.onclick = null;
        }

        if (plusBtn) {
            plusBtn.onclick = (e) => {
                e.stopPropagation();
                recordCurrentDamage(skill, detailDisplay, idx, state.currentId, logic.saveCurrentStats);
            };
        }
    }, 10);

    logic.updateStats();
}

/**
 * 속성 선택기 UI 설정
 */
export function setupAttributeControl(charId, logic) {
    const container = document.getElementById(`attribute-container-${charId}`);
    if (!container) return;

    const currentAttr = state.currentDisplayedAttribute;
    const charInfo = charData[charId]?.info;
    const myAttrIdx = charInfo ? charInfo.속성 : -1;
    
    let displayAttrs = new Set();
    if (myAttrIdx >= 0 && myAttrIdx < 5) displayAttrs.add(constants.attributeList[myAttrIdx]);
    
    const relationships = { 0: { win: 2, lose: 1 }, 1: { win: 0, lose: 2 }, 2: { win: 1, lose: 0 }, 3: { win: 4, lose: 4 }, 4: { win: 3, lose: 3 } };
    if (myAttrIdx in relationships) {
        const rel = relationships[myAttrIdx];
        if (rel.win !== null) displayAttrs.add(constants.attributeList[rel.win]);
        if (rel.lose !== null) displayAttrs.add(constants.attributeList[rel.lose]);
    } else { displayAttrs = new Set(constants.attributeList); }
    displayAttrs.add(currentAttr);

    let othersHtml = '';
    displayAttrs.forEach(attr => {
        if (attr === currentAttr) return;
        let glowColor = '';
        if (myAttrIdx >= 0 && myAttrIdx < 5) {
             const attrIdx = constants.attributeList.indexOf(attr);
             const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 };
             const loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 };
             if (wins[myAttrIdx] === attrIdx) glowColor = '#00ff00';
             else if (loses[myAttrIdx] === attrIdx) {
                 if (myAttrIdx <= 2 && attrIdx <= 2) glowColor = '#ff0000';
                 if ((myAttrIdx === 3 && attrIdx === 4) || (myAttrIdx === 4 && attrIdx === 3)) glowColor = '#00ff00';
             }
        }
        const glowStyle = glowColor ? `background: ${glowColor}; box-shadow: 0 0 10px ${glowColor}; filter: blur(4px); opacity: 0.8;` : '';
        othersHtml += `<div class="attr-control-item">${glowColor ? `<div class="attr-control-glow" style="${glowStyle}"></div>` : ''}<img src="${constants.attributeImageMap[attr]}" class="other-attribute-icon attr-control-img" data-attr="${attr}" title="${attr} 속성"></div>`;
    });

    let currentGlowColor = '';
    const currentAttrIdx = constants.attributeList.indexOf(currentAttr);
    if (myAttrIdx >= 0 && myAttrIdx < 5 && currentAttr !== constants.attributeList[myAttrIdx]) {
         const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 };
         const loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 };
         if (wins[myAttrIdx] === currentAttrIdx) currentGlowColor = '#00ff00';
         else if (loses[myAttrIdx] === currentAttrIdx) {
             if (myAttrIdx <= 2 && currentAttrIdx <= 2) currentGlowColor = '#ff0000';
             if ((myAttrIdx === 3 && currentAttrIdx === 4) || (myAttrIdx === 4 && currentAttrIdx === 3)) currentGlowColor = '#00ff00';
         }
    }
    const currentGlowStyle = currentGlowColor ? `background: ${currentGlowColor}; box-shadow: 0 0 15px ${currentGlowColor}; filter: blur(6px); opacity: 0.9;` : '';
    
    container.innerHTML = `<div class="attr-control-others">${othersHtml}</div><div class="attr-control-current-wrapper"><div class="attr-control-current-box">${currentGlowColor ? `<div class="attr-control-current-glow" style="${currentGlowStyle}"></div>` : ''}<img src="${constants.attributeImageMap[currentAttr]}" class="current-attribute-icon attr-control-current-img" alt="${currentAttr} 속성"></div></div>`;

    container.querySelectorAll('.other-attribute-icon').forEach(icon => {
        icon.onclick = (e) => {
            e.stopPropagation();
            state.currentDisplayedAttribute = icon.dataset.attr;
            if (!state.savedStats[charId]) state.savedStats[charId] = {};
            state.savedStats[charId].currentDisplayedAttribute = state.currentDisplayedAttribute;
            logic.saveCurrentStats(); logic.updateStats(); setupAttributeControl(charId, logic);
        };
    });
}



/**
 * 커스텀 컨트롤(캐릭터별 전용 카운터/토글) 렌더링
 */
export function renderCustomControls(charId, data, logic) {
    const container = document.getElementById('custom-controls-container');
    if (!container || !data.customControls) {
        if (container) container.innerHTML = '';
        return;
    }

    container.innerHTML = '';
    const savedValues = state.savedStats[charId]?.customValues || {};

    data.customControls.forEach(ctrl => {
        // [추가] 시뮬레이터 전용 컨트롤은 상세 뷰에서 제외
        if (ctrl.scope === 'sim') return;

        const wrapper = document.createElement('div');
        wrapper.className = 'custom-control-group';

        // 라벨
        const label = document.createElement('div');
        label.className = 'custom-control-label';
        label.textContent = ctrl.label || ctrl.id;
        wrapper.appendChild(label);

        // 컨트롤 (카운터 또는 토글)
        const btn = document.createElement('button');
        
        // 현재 값 가져오기 (저장된 값 없으면 초기값, 그것도 없으면 기본값)
        let currentVal = savedValues[ctrl.id];
        if (currentVal === undefined) {
            currentVal = ctrl.initial !== undefined ? ctrl.initial : (ctrl.type === 'toggle' ? false : 0);
        }

        if (ctrl.type === 'counter') {
            btn.className = 'custom-counter-btn';
            btn.textContent = currentVal;
            
            btn.onclick = () => {
                const min = ctrl.min !== undefined ? ctrl.min : 0;
                const max = ctrl.max !== undefined ? ctrl.max : 10;
                let nextVal = currentVal + 1;
                if (nextVal > max) nextVal = min;
                
                // 상태 업데이트
                if (!state.savedStats[charId].customValues) state.savedStats[charId].customValues = {};
                state.savedStats[charId].customValues[ctrl.id] = nextVal;
                
                logic.saveCurrentStats(); 
                logic.updateStats();
                renderCustomControls(charId, data, logic); // 리렌더링 (값 갱신)
            };
        } else if (ctrl.type === 'toggle') {
            btn.className = `custom-toggle-btn ${currentVal ? 'on' : 'off'}`;
            btn.textContent = currentVal ? "ON" : "OFF";

            btn.onclick = () => {
                const nextVal = !currentVal;
                
                // 상태 업데이트
                if (!state.savedStats[charId].customValues) state.savedStats[charId].customValues = {};
                state.savedStats[charId].customValues[ctrl.id] = nextVal;
                
                logic.saveCurrentStats();
                logic.updateStats();
                renderCustomControls(charId, data, logic);
            };
        }

        wrapper.appendChild(btn);
        container.appendChild(wrapper);
    });
}

/**
 * 대상 수 조절 버튼 렌더링
 */
export function renderGlobalTargetControl(charId, data, logic) {
    const container = document.getElementById('global-target-control');
    if (!container || charId === 'hero') return;

    const hasMulti = data.skills.some(s => s.isMultiTarget || s.id === "choiyuhyun_skill7" || (s.damageDeal && s.damageDeal.some(d => d.isMultiTarget || d.stampIsMultiTarget)));
    if (!hasMulti) { container.innerHTML = ''; return; }

    const count = state.savedStats[charId]?.commonMultiTargetCount || 1;
    container.innerHTML = `
        <div id="multi-target-control" class="target-control-group">
            <div class="target-control-label">대상 수</div>
            <button class="target-control-btn">${count}</button>
        </div>
    `;

    container.querySelector('button').onclick = (e) => {
        let newCount = (count === 5) ? 1 : count + 1;
        state.savedStats[charId].commonMultiTargetCount = newCount;
        logic.saveCurrentStats(); logic.updateStats(); renderGlobalTargetControl(charId, data, logic);
    };
}

/**
 * 상세 스킬 아이콘 목록 렌더링
 */
export function renderSkillIconList(charId, breakthroughValue, dom, logic) {
    if (!dom.newSectionArea || charId === 'hero') return;
    const data = charData[charId];
    const container = dom.newSectionArea.querySelector('.detail-icon-list');
    if (!container) return;

    const saved = state.savedStats[charId] || {};
    const isUltStamped = saved.stamp || false;

    let html = '';
    // 1. 본인 스킬 아이콘들
    data.skills.forEach((s, i) => {
        if (s.id === "beernox_skill1" || (s.isUltExtra && !isUltStamped)) return;
        const hasDamage = s.damageDeal && s.damageDeal.length > 0;
        if (!hasDamage) return;
        if ((i === 4 && breakthroughValue < 30) || (i === 5 && breakthroughValue < 50) || (i === 6 && breakthroughValue < 75)) return;

        const isSelected = state.selectedSkillIndex === i && !state.selectedIsExternal;
        // 7번 스킬(인덱스 7)인 경우 배경색 처리를 위한 클래스 추가
        const extraClass = (i === 7) ? 'passive-max' : ''; 
        html += `<img src="${s.icon}" class="detail-icon-list-item ${isSelected ? 'selected' : ''} ${extraClass}" data-idx="${i}" title="${s.name}">`;
    });

    // 2. 외부 추가데미지 버프 아이콘들
    if (state.currentExtraDamages && state.currentExtraDamages.length > 0) {
        state.currentExtraDamages.forEach((extra, i) => {
            const isSelected = state.selectedSkillIndex === i && state.selectedIsExternal;
            // 외부 버프임을 나타내는 보라색 테두리 또는 스타일을 살짝 가미할 수 있습니다.
            html += `<img src="${extra.icon}" class="detail-icon-list-item ${isSelected ? 'selected' : ''}" data-idx="${i}" data-is-external="true" title="[추가데미지] ${extra.name}">`;
        });
    }

    container.innerHTML = html;

    container.querySelectorAll('img').forEach(img => {
        img.onclick = () => {
            const isExternal = img.dataset.isExternal === "true";
            const idx = parseInt(img.dataset.idx);
            
            if (state.selectedSkillIndex === idx && state.selectedIsExternal === isExternal) return;

            state.selectedSkillIndex = idx;
            state.selectedIsExternal = isExternal;
            
            if (isExternal) {
                updateSkillDetailDisplay(state.currentExtraDamages[idx], idx, dom, logic);
            } else {
                state.savedStats[charId].lastSelectedSkillIndex = idx;
                updateSkillDetailDisplay(data.skills[idx], idx, dom, logic);
                logic.saveCurrentStats();
            }
            renderSkillIconList(charId, breakthroughValue, dom, logic);
        };
    });

    // [추가] 아이콘 목록 변경 시 하단 버튼 상태 갱신을 위해 레코드 렌더링 호출
    renderDamageRecords(charId, dom.newSectionArea, logic.saveCurrentStats);
}
