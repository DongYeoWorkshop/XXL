// handlers.js
import { state, constants } from './state.js';
import { charData } from './data.js';
import { updateSkillStatesByBreakthrough } from './breakthrough.js';
import { renderBuffSearchResults, displayBuffSkills, renderAppliedBuffsDisplay } from './ui.js';
import { renderSkills } from './render-skills.js';
import { addAppliedBuff, removeAppliedBuff } from './buffs.js';
import { getDynamicDesc } from './formatter.js';
import { updateSkillDetailDisplay, renderGlobalTargetControl, renderSkillIconList, renderCustomControls } from './detail-view.js';
import { renderDamageRecords } from './records.js';

let dom = {};
let logic = {};

export function initHandlers(domElements, logicFunctions) {
    dom = domElements;
    logic = logicFunctions;
    setupSortListeners();
    setupHeaderListeners();

    // 사용자가 직접 스크롤할 때 실시간 저장 (새로고침 대응)
    window.addEventListener('scroll', () => {
        if (state.currentId) {
            localStorage.setItem(`scroll_pos_${state.currentId}`, window.scrollY);
        }
    });

    if (dom.sliderInput) {
        dom.sliderInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (val > 1) {
                const snapped = Math.round(val / 5) * 5;
                const finalVal = Math.max(1, Math.min(60, snapped));
                if (Math.abs(val - finalVal) <= 2) e.target.value = finalVal;
            }
        });
    }

    const simulatorBtn = document.getElementById('nav-simulator-btn');
    if (simulatorBtn) simulatorBtn.onclick = () => handleImageClick(simulatorBtn);

    window.triggerDetailUpdate = (idx) => {
        if (state.selectedSkillIndex === idx) {
            const data = charData[state.currentId];
            if (data && data.skills[idx]) updateSkillDetailDisplay(data.skills[idx], idx, dom, logic);
        }
    };

    window.triggerIconListUpdate = () => {
        if (state.currentId && !['hero', 'simulator'].includes(state.currentId)) {
            const brVal = parseInt(dom.extraSlider1.value) || 0;
            renderSkillIconList(state.currentId, brVal, dom, logic);
        }
    };

    window.addEventListener('resize', () => {
        if (state.currentId && !['hero', 'simulator'].includes(state.currentId)) {
            logic.updateStats();
        }
    });
}

export function onExtraSliderChange() {
    if (!state.currentId || ['hero', 'simulator'].includes(state.currentId)) return;
    const brVal = parseInt(dom.extraSlider1.value) || 0;
    const brText = (brVal < 5) ? `0성 ${brVal}단계` : (brVal < 15) ? `1성 ${brVal - 5}단계` : (brVal < 30) ? `2성 ${brVal - 15}단계` : (brVal < 50) ? `3성 ${brVal - 30}단계` : (brVal < 75) ? `4성 ${brVal - 50}단계` : "5성";
    if (dom.extraVal1) dom.extraVal1.innerText = brText;
    if (dom.extraVal2) dom.extraVal2.innerText = dom.extraSlider2.value;
    if (dom.levelVal) dom.levelVal.innerText = dom.sliderInput.value;
    updateSkillStatesByBreakthrough(brVal, dom.skillContainer, state.currentId, state.savedStats);
    renderSkillIconList(state.currentId, brVal, dom, logic);
    renderGlobalTargetControl(state.currentId, charData[state.currentId], logic);
    logic.updateStats();
    logic.saveCurrentStats();
}

function setupHeaderListeners() {
    // [추가] 헤더 아이콘 클릭 시 Hero/시뮬레이터 전환
    const toggleIcon = document.getElementById('header-toggle-icon');
    if (toggleIcon) {
        toggleIcon.onclick = () => {
            if (state.currentId === 'hero') {
                const simBtn = document.getElementById('nav-simulator-btn');
                if (simBtn) handleImageClick(simBtn);
            } else {
                const heroBtn = document.querySelector('.main-image[data-id="hero"]');
                if (heroBtn) handleImageClick(heroBtn);
            }
        };
    }

    const headerTitle = document.getElementById('sticky-header-title');
    if (headerTitle) {
        headerTitle.onclick = () => {
            state.currentId = null;
            localStorage.removeItem('lastSelectedCharId');
            const contentDisplay = document.getElementById('content-display');
            if (contentDisplay) { contentDisplay.classList.remove('hero-mode'); contentDisplay.classList.add('landing-mode'); }
            hideAllSections();
            document.getElementById('landing-page').style.display = 'block';
            document.querySelector('.main-content-column').style.display = 'block';
            import('./hero-tab.js').then(mod => mod.clearHeroTabRemnants());
            document.querySelector('.main-image.selected')?.classList.remove('selected');
            forceMainHeader();
            logic.updateStats();
            window.scrollTo(0, 0);
        };
    }
    const stickyName = document.getElementById('sticky-name');
    if (stickyName) {
        stickyName.onclick = () => {
            if (!state.currentId) return;
            const visibleImgs = Array.from(dom.images).filter(img => { const style = window.getComputedStyle(img); return style.display !== 'none' && img.dataset.id !== 'hero' && img.dataset.id !== 'simulator'; });
            if (visibleImgs.length > 1) { const currentIdx = visibleImgs.findIndex(img => img.dataset.id === state.currentId); const nextIdx = (currentIdx + 1) % visibleImgs.length; handleImageClick(visibleImgs[nextIdx]); }
        };
    }
    const stickyAttr = document.getElementById('sticky-attr');
    if (stickyAttr) stickyAttr.onclick = () => { const heroImg = document.querySelector('.main-image[data-id="hero"]'); if (heroImg) handleImageClick(heroImg); };
    document.getElementById('sticky-lv')?.addEventListener('click', () => cycleValue(dom.sliderInput, 1, 60, 5));
    document.getElementById('sticky-br')?.addEventListener('click', () => cycleThresholds(dom.extraSlider1, [0, 5, 15, 30, 50, 75]));
    document.getElementById('sticky-fit')?.addEventListener('click', () => cycleValue(dom.extraSlider2, 0, 5, 1));
    document.getElementById('br-up-btn')?.addEventListener('click', () => adjustSlider(dom.extraSlider1, 1, 75));
    document.getElementById('br-down-btn')?.addEventListener('click', () => adjustSlider(dom.extraSlider1, -1, 75));
}

function forceMainHeader() {
    const headerTitle = document.getElementById('sticky-header-title');
    const toggleIcon = document.getElementById('header-toggle-icon');
    if (toggleIcon) { toggleIcon.style.setProperty('display', 'block', 'important'); }
    if (headerTitle) { headerTitle.style.setProperty('display', 'flex', 'important'); headerTitle.innerHTML = `동여성 공방`; }
    ['sticky-name', 'sticky-attr', 'sticky-lv', 'sticky-br', 'sticky-fit'].forEach(id => { const el = document.getElementById(id); if (el) { el.style.setProperty('display', 'none', 'important'); el.innerText = ''; } });
}

function hideAllSections() {
    const ids = ['landing-page', 'simulator-page', 'new-section-area', 'buff-application-area', 'skill-container', 'calc-and-stats-row', 'sub-stats-wrapper', 'info-display'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.setProperty('display', 'none', 'important'); });
    const mainCol = document.querySelector('.main-content-column');
    const sideCol = document.querySelector('.side-content-column');
    if (mainCol) mainCol.style.setProperty('display', 'none', 'important');
    if (sideCol) sideCol.style.setProperty('display', 'none', 'important');
    const charHeader = document.querySelector('.char-header-row');
    if (charHeader) charHeader.style.setProperty('display', 'none', 'important');
}

export function handleImageClick(img) {
    const id = img.dataset.id;
    if (!id) return;
    
    // 1. 떠나기 전 현재 위치 저장 (캐릭터 탭만 유지하고 싶을 경우 대비)
    if (state.currentId && state.currentId !== 'simulator') {
        localStorage.setItem(`scroll_pos_${state.currentId}`, window.scrollY);
    }

    // 2. 화면 즉시 초기화 (연동 차단 및 시뮬레이터 상단 시작 보장)
    window.scrollTo(0, 0);

    document.querySelector('.main-image.selected')?.classList.remove('selected');
    img.classList.add('selected');
    img.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    
    state.currentId = id;
    const contentDisplay = document.getElementById('content-display');
    hideAllSections();

    if (id === 'hero') {
        contentDisplay.className = 'hero-mode'; 
        forceMainHeader();
        import('./hero-tab.js').then(mod => {
            mod.clearHeroTabRemnants();
            mod.renderHeroTab(dom, logic.updateStats);
            // Hero 탭도 필요시 저장된 위치로 가되, 지연 없이 즉시 시도
            const saved = localStorage.getItem('scroll_pos_hero');
            if (saved) window.scrollTo(0, parseInt(saved));
        });
    } else if (id === 'simulator') {
        contentDisplay.className = 'hero-mode';
        document.querySelector('.main-content-column').style.setProperty('display', 'block', 'important');
        document.getElementById('simulator-page').style.setProperty('display', 'block', 'important');
        forceMainHeader();
        import('./hero-tab.js').then(mod => mod.clearHeroTabRemnants());
        import('./simulator.js').then(mod => {
            mod.initSimulator();
            // 시뮬레이터는 무조건 0에서 시작 (추가 조치 없음)
            window.scrollTo(0, 0);
        });
    } else {
        contentDisplay.className = '';
        contentDisplay.style.display = '';
        contentDisplay.style.width = '';
        const charHeader = document.querySelector('.char-header-row');
        if (charHeader) charHeader.style.display = 'block';
        const mainCol = document.querySelector('.main-content-column');
        const sideCol = document.querySelector('.side-content-column');
        if (mainCol) { mainCol.style.display = 'block'; mainCol.style.width = ''; }
        if (sideCol) sideCol.style.display = 'block';

        const show = (target, type = 'block') => { const el = document.getElementById(target); if (el) el.style.setProperty('display', type, 'important'); };
        ['new-section-area', 'buff-application-area', 'info-display', 'calc-area', 'bonus-sliders', 'sub-stats-wrapper'].forEach(s => show(s));
        show('skill-container', 'grid'); show('calc-and-stats-row', 'flex');
        
        const data = charData[id], saved = state.savedStats[id] || {};
        
        // [추가] 캐릭터 선택 시 기본 타겟 속성을 본인 속성으로 맞춤 (무상성 기준)
        if (data.info && data.info.속성 !== undefined) {
            state.currentDisplayedAttribute = constants.attributeList[data.info.속성];
        }

        // UI 갱신 로직...
        if (dom.titleArea) {
            const isFav = saved.isFavorite || false;
            dom.titleArea.innerHTML = `<span>${data.title}</span><button class="char-fav-btn ${isFav ? 'active' : ''}">${isFav ? '★' : '☆'}</button>`;
            dom.titleArea.querySelector('.char-fav-btn').onclick = (e) => {
                e.stopPropagation(); const nowFav = !e.target.classList.contains('active'); e.target.classList.toggle('active', nowFav); e.target.innerText = nowFav ? '★' : '☆';
                if (!state.savedStats[id]) state.savedStats[id] = {}; state.savedStats[id].isFavorite = nowFav; logic.saveCurrentStats();
            };
        }

        const infoDisplay = document.getElementById('info-display');
        if (infoDisplay && data.info) {
            infoDisplay.innerHTML = '';
            Object.entries(data.info).forEach(([k, v]) => {
                const s = document.createElement('span');
                // [수정] 아이콘 간 확실한 간격을 위해 마진 추가
                s.style.margin = '0 10px'; 
                if (k === "속성") s.innerHTML = `<img src="${constants.attributeImageMap[constants.attributeList[v]]}" style="width:40px;height:40px;">`;
                else if (k === "포지션") s.innerHTML = `<img src="${constants.positionImageMap[v]}" style="width:40px;height:40px;">`;
                else s.innerHTML = `<b>${k}:</b> ${v}`;
                infoDisplay.appendChild(s);
            });
        }

        dom.sliderInput.value = saved.lv || 1; dom.extraSlider1.value = saved.s1 || 0; dom.extraSlider2.value = saved.s2 || 0;
        state.appliedBuffs = {};
        if (data.defaultBuffSkills) data.defaultBuffSkills.forEach(sid => addAppliedBuff(id, sid, true, false, state.appliedBuffs));
        if (saved.appliedBuffs) {
            for (const bId in saved.appliedBuffs) {
                if (!charData[bId]) continue;
                if (!state.appliedBuffs[bId]) state.appliedBuffs[bId] = [];
                saved.appliedBuffs[bId].forEach(sb => { const ex = state.appliedBuffs[bId].find(b => b.skillId === sb.skillId); if (ex) Object.assign(ex, sb); else state.appliedBuffs[bId].push({ ...sb }); });
            }
        }
        
        renderSkills(id, charData, state.savedStats, state.currentSkillLevels, dom.skillContainer, logic.updateStats, logic.saveCurrentStats, dom.sliderInput);
        setupInitialNewSection(id, data, saved.s1 || 0);
        onExtraSliderChange(); logic.updateStats();
        
        // 캐릭터 탭은 저장된 위치로 즉시 이동
        const savedScroll = localStorage.getItem(`scroll_pos_${id}`);
        if (savedScroll) window.scrollTo(0, parseInt(savedScroll));
    }
    logic.saveCurrentStats();
}

function setupInitialNewSection(id, data, brVal) {
    dom.newSectionArea.innerHTML = `<div class="skill-detail-display"><div class="skill-detail-tab-tag"><div class="skill-detail-tab-content">스킬 데미지 계산</div></div><p style="margin:0; color:#888; font-size:0.85em; text-align:center; padding:20px 0;">아이콘을 클릭하여 상세 정보를 확인하세요.</p></div><div class="icon-list-row"><div class="detail-icon-list"></div><div class="controls-wrapper"><div id="custom-controls-container" style="display: flex; gap: 8px; align-items: flex-end;"></div><div id="global-target-control"></div></div></div>`;
    renderSkillIconList(id, brVal, dom, logic); renderCustomControls(id, data, logic); renderGlobalTargetControl(id, data, logic);
    if (state.selectedSkillIndex !== null && data.skills[state.selectedSkillIndex]) updateSkillDetailDisplay(data.skills[state.selectedSkillIndex], state.selectedSkillIndex, dom, logic);
    renderDamageRecords(id, dom.newSectionArea, logic.saveCurrentStats);
}

function setupSortListeners() {
    const imageRow = document.querySelector('.image-row');
    const applyFilter = (type, value = null) => {
        imageRow.querySelectorAll('.main-image').forEach(img => { const charId = img.dataset.id; if (charId === 'hero' || charId === 'simulator') { img.style.display = 'block'; return; }
            if (type === 'all') img.style.display = 'block'; else if (type === 'fav') img.style.display = state.savedStats[charId]?.isFavorite ? 'block' : 'none'; else if (type === 'attr') img.style.display = (charData[charId]?.info?.속성 === value) ? 'block' : 'none'; });
    };
    document.querySelector('.sort-icon-all')?.addEventListener('click', () => applyFilter('all')); document.querySelector('.sort-icon-fav')?.addEventListener('click', () => applyFilter('fav'));
    document.querySelectorAll('.sort-icon').forEach(icon => { icon.onclick = () => applyFilter('attr', parseInt(icon.dataset.attr)); });
}

function adjustSlider(slider, delta, max) { let val = parseInt(slider.value) + delta; if (val >= 0 && val <= max) { slider.value = val; onExtraSliderChange(); } }
function cycleValue(slider, min, max, step) { let val = parseInt(slider.value); let next = (val < step && step > 1) ? step : (Math.floor(val / step) * step + step); if (next > max) next = min; slider.value = next; onExtraSliderChange(); }
function cycleThresholds(slider, thresholds) { let val = parseInt(slider.value); let next = thresholds.find(t => t > val); slider.value = next !== undefined ? next : thresholds[0]; onExtraSliderChange(); }

export function setupBuffSearchListeners() {
    const searchInput = document.getElementById('buff-char-search'); if (!searchInput) return;
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase(); const resultsEl = document.getElementById('buff-search-results'); if (!query) { if (resultsEl) resultsEl.style.display = 'none'; return; }
        const matches = Object.keys(charData).filter(id => id !== state.currentId && charData[id].title?.toLowerCase().includes(query));
        renderBuffSearchResults(matches, charData, resultsEl, searchInput, document.getElementById('buff-skill-selection-area'), displayBuffSkills, state.appliedBuffs, addAppliedBuff, removeAppliedBuff, renderAppliedBuffsDisplay, logic.updateStats, dom.sliderInput, state.currentSkillLevels, getDynamicDesc, state.savedStats, logic.saveCurrentStats);
    });
}

export function setupDragScroll(slider, storageKey = null) {
    let isDown = false, startX, scrollLeft;
    if (storageKey) { const saved = localStorage.getItem(storageKey); if (saved) slider.scrollLeft = parseInt(saved); }
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) { slider.addEventListener('scroll', () => { if (storageKey) localStorage.setItem(storageKey, slider.scrollLeft); }); return; }
    slider.onmousedown = e => { isDown = true; startX = e.pageX - slider.offsetLeft; scrollLeft = slider.scrollLeft; };
    slider.onmouseup = () => { isDown = false; };
    slider.onmouseleave = () => { isDown = false; };
    slider.onmousemove = e => { if (!isDown) return; const x = e.pageX - slider.offsetLeft; slider.scrollLeft = scrollLeft - (x - startX) * 0.8; if (storageKey) localStorage.setItem(storageKey, slider.scrollLeft); };
}
