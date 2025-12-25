// handlers.js
import { state, constants } from './state.js';
import { charData } from './data.js'; // 추가
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

    // [복구] 레벨 슬라이더 5단위 강력 스냅 로직
    if (dom.sliderInput) {
        dom.sliderInput.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (val > 1) {
                const snapped = Math.round(val / 5) * 5;
                const finalVal = Math.max(1, Math.min(60, snapped));
                if (Math.abs(val - finalVal) <= 2) {
                    e.target.value = finalVal;
                }
            }
        });
    }

    window.triggerDetailUpdate = (idx) => {
        if (state.selectedSkillIndex === idx) {
            const data = charData[state.currentId];
            if (data && data.skills[idx]) updateSkillDetailDisplay(data.skills[idx], idx, dom, logic);
        }
    };

    window.triggerIconListUpdate = () => {
        if (state.currentId && state.currentId !== 'hero') {
            const brVal = parseInt(dom.extraSlider1.value) || 0;
            renderSkillIconList(state.currentId, brVal, dom, logic);
        }
    };

    // [추가] 스크롤 위치 저장
    window.addEventListener('scroll', () => {
        if (state.currentId) {
            localStorage.setItem(`scrollPos_${state.currentId}`, window.scrollY);
        }
    });

    // [추가] 화면 크기 변경 시 UI 즉시 갱신 (PC/모바일 전환 대응)
    window.addEventListener('resize', () => {
        if (state.currentId) {
            logic.updateStats();
        }
    });
}

function setupHeaderListeners() {
    const headerTitle = document.getElementById('sticky-header-title');
    // [수정] 타이틀 클릭 시 '진짜 초기화면'(랜딩 페이지)으로 전환
    if (headerTitle) {
        headerTitle.onclick = () => {
            state.currentId = null; // 선택된 캐릭터 없음
            state.selectedSkillIndex = null;
            localStorage.removeItem('lastSelectedCharId');
            
            // 모든 조작/스탯 영역 숨김
            const contentDisplay = document.getElementById('content-display');
            const row = document.getElementById('calc-and-stats-row');
            const subWrap = document.getElementById('sub-stats-wrapper');
            const infoDisp = document.getElementById('info-display');
            const statsWrapper = document.getElementById('stats-wrapper');
            const charHeaderRow = document.querySelector('.char-header-row');
            
            if (contentDisplay) contentDisplay.classList.remove('hero-mode');
            if (charHeaderRow) charHeaderRow.style.display = 'none';
            if (dom.buffApplicationArea) dom.buffApplicationArea.style.display = 'none';
            if (dom.skillContainer) dom.skillContainer.style.display = 'none';
            
            if (row) row.style.display = 'none';
            if (subWrap) subWrap.style.display = 'none';
            if (infoDisp) infoDisp.style.display = 'none';
            if (statsWrapper) statsWrapper.style.display = 'none';

            // [추가] Hero 탭의 잔재 제거
            const oldGraph = document.getElementById('hero-graph-container');
            if (oldGraph) oldGraph.remove();
            const oldTables = document.getElementById('hero-comparison-tables');
            if (oldTables) oldTables.remove();

            // 중앙에 환영 대시보드만 표시
            const landingPage = document.getElementById('landing-page');
            const mainColumn = document.querySelector('.main-content-column');
            
            if (landingPage) landingPage.style.display = 'block';
            if (mainColumn) mainColumn.style.display = 'block'; // [추가] 숨겨졌던 메인 컬럼 다시 보이기
            
            if (dom.newSectionArea) {
                dom.newSectionArea.style.display = 'none';
            }

            dom.titleArea.innerText = "동여성 공방";
            document.querySelector('.main-image.selected')?.classList.remove('selected');
            
            // [중요] 헤더 상태만 업데이트하기 위해 currentId가 없는 상태로 updateStats 호출
            logic.updateStats(); 
            
            // 스크롤 최상단으로
            window.scrollTo(0, 0);
        };
    }

    // [추가] 헤더 이름 클릭 시 다음 캐릭터로 전환
    const stickyName = document.getElementById('sticky-name');
    if (stickyName) {
        stickyName.onclick = () => {
            if (!state.currentId) return;

            // 현재 화면에 보이고 있는(필터링된) 캐릭터 이미지들 중 'hero' 제외
            const visibleImgs = Array.from(dom.images).filter(img => {
                const style = window.getComputedStyle(img);
                return style.display !== 'none' && img.dataset.id !== 'hero'; // hero 제외 조건 추가
            });

            if (visibleImgs.length > 1) {
                // 현재 캐릭터의 위치 찾기
                const currentIdx = visibleImgs.findIndex(img => img.dataset.id === state.currentId);
                // 다음 캐릭터 인덱스 계산 (마지막이면 처음으로)
                const nextIdx = (currentIdx + 1) % visibleImgs.length;
                // 다음 캐릭터 클릭 실행
                handleImageClick(visibleImgs[nextIdx]);
            }
        };
    }

    // 헤더 수치 순환 조절
    document.getElementById('sticky-lv')?.addEventListener('click', () => cycleValue(dom.sliderInput, 1, 60, 5));
    document.getElementById('sticky-br')?.addEventListener('click', () => cycleThresholds(dom.extraSlider1, [0, 5, 15, 30, 50, 75]));
    document.getElementById('sticky-fit')?.addEventListener('click', () => cycleValue(dom.extraSlider2, 0, 5, 1));

    // 증감 버튼
    document.getElementById('br-up-btn')?.addEventListener('click', () => adjustSlider(dom.extraSlider1, 1, 75));
    document.getElementById('br-down-btn')?.addEventListener('click', () => adjustSlider(dom.extraSlider1, -1, 75));
}

function adjustSlider(slider, delta, max) {
    let val = parseInt(slider.value) + delta;
    if (val >= 0 && val <= max) { slider.value = val; onExtraSliderChange(); }
}

function cycleValue(slider, min, max, step) {
    let val = parseInt(slider.value);
    let next = (val < step && step > 1) ? step : (Math.floor(val / step) * step + step);
    if (next > max) next = min;
    slider.value = next;
    onExtraSliderChange();
}

function cycleThresholds(slider, thresholds) {
    let val = parseInt(slider.value);
    let next = thresholds.find(t => t > val);
    slider.value = next !== undefined ? next : thresholds[0];
    onExtraSliderChange();
}

export function onExtraSliderChange() {
    const brVal = parseInt(dom.extraSlider1.value) || 0;
    dom.extraVal1.innerText = (brVal < 5) ? `0성 ${brVal}단계` : (brVal < 15) ? `1성 ${brVal - 5}단계` : (brVal < 30) ? `2성 ${brVal - 15}단계` : (brVal < 50) ? `3성 ${brVal - 30}단계` : (brVal < 75) ? `4성 ${brVal - 50}단계` : "5성";
    dom.extraVal2.innerText = dom.extraSlider2.value;
    dom.levelVal.innerText = dom.sliderInput.value;

    if (state.currentId && state.currentId !== 'hero') {
        updateSkillStatesByBreakthrough(brVal, dom.skillContainer, state.currentId, state.savedStats);
        renderSkillIconList(state.currentId, brVal, dom, logic);
        renderGlobalTargetControl(state.currentId, charData[state.currentId], logic);
    }
    logic.updateStats(); logic.saveCurrentStats();
}

export function handleImageClick(img) {
    const id = img.dataset.id;
    if (state.currentId === id) { logic.updateStats(); return; }

    // [추가] 캐릭터 변경 시 버프 검색창 및 스킬 선택 영역 초기화
    if (dom.buffCharSearch) dom.buffCharSearch.value = '';
    if (dom.buffSearchResults) dom.buffSearchResults.style.display = 'none';
    if (dom.buffSkillSelectionArea) dom.buffSkillSelectionArea.style.display = 'none';

    document.querySelector('.main-image.selected')?.classList.remove('selected');
    img.classList.add('selected');
    
    // [추가] 선택된 이미지가 목록에서 잘 보이도록 자동 스크롤
    img.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    
    state.currentId = id;
    const data = charData[id];
    if (!data) return;

    // [추가] 캐릭터 선택 시 랜딩 페이지 숨김 및 동적 섹션 표시
    const landingPage = document.getElementById('landing-page');
    if (landingPage) landingPage.style.display = 'none';
    if (dom.newSectionArea) dom.newSectionArea.style.display = 'block';

    const saved = state.savedStats[id] || {};
    state.selectedSkillIndex = saved.lastSelectedSkillIndex ?? null;
    state.currentDisplayedAttribute = saved.currentDisplayedAttribute || constants.attributeList[data.info?.속성 || 0] || '불';
    
    // [수정] 이름 옆에 별 버튼 추가 및 상태 복구
    if (id === 'hero') {
        dom.titleArea.innerText = "캐릭터를 선택해주세요";
    } else {
        const isFav = saved.isFavorite || false;
        dom.titleArea.innerHTML = `
            <span>${data.title}</span>
            <button class="char-fav-btn ${isFav ? 'active' : ''}" title="즐겨찾기">
                ${isFav ? '★' : '☆'}
            </button>
        `;

        // 별 버튼 클릭 이벤트
        const favBtn = dom.titleArea.querySelector('.char-fav-btn');
        favBtn.onclick = (e) => {
            e.stopPropagation();
            const nowFav = !favBtn.classList.contains('active');
            favBtn.classList.toggle('active', nowFav);
            favBtn.innerText = nowFav ? '★' : '☆';
            
            // 상태 저장
            if (!state.savedStats[id]) state.savedStats[id] = {};
            state.savedStats[id].isFavorite = nowFav;
            logic.saveCurrentStats();
        };
    }

    // [복구] 속성 및 포지션 정보 표시
    const infoDisplay = document.getElementById('info-display');
    
    const contentDisplay = document.getElementById('content-display');
    
    if (id === 'hero') {
        // [Hero 전용: 딜비교 화면] ---------------------------------------
        if (contentDisplay) contentDisplay.classList.add('hero-mode');
        
        const charHeaderRow = document.querySelector('.char-header-row');
        if (charHeaderRow) charHeaderRow.style.display = 'none';

        const sideColumn = document.querySelector('.side-content-column');
        if (sideColumn) sideColumn.style.display = 'none';
        
        const mainColumn = document.querySelector('.main-content-column');
        if (mainColumn) mainColumn.style.display = 'none';

        if (dom.buffApplicationArea) dom.buffApplicationArea.style.display = 'none';
        
        const row = document.getElementById('calc-and-stats-row');
        if (row) row.style.display = 'none';

        dom.titleArea.innerText = ""; 
        logic.updateStats(); 
        logic.saveCurrentStats(); 
    } else {        // [일반 캐릭터 로직] ---------------------------------------
        if (contentDisplay) contentDisplay.classList.remove('hero-mode');
        
        const charHeaderRow = document.querySelector('.char-header-row');
        if (charHeaderRow) charHeaderRow.style.display = '';

        const sideColumn = document.querySelector('.side-content-column');
        if (sideColumn) sideColumn.style.display = '';
        
        const mainColumn = document.querySelector('.main-content-column');
        if (mainColumn) mainColumn.style.display = '';

        const row = document.getElementById('calc-and-stats-row');
        const calcArea = document.getElementById('calc-area');
        const statsWrapper = document.getElementById('stats-wrapper'); // 추가
        const subWrap = document.getElementById('sub-stats-wrapper');
        
        if (row) {
            row.style.display = 'flex'; // 복구
            row.style.flexDirection = ''; 
        }
        if (calcArea) calcArea.style.display = 'flex';
        if (statsWrapper) {
            statsWrapper.style.display = 'flex';
            statsWrapper.style.width = ''; // 초기화
        }
        if (subWrap) subWrap.style.display = 'block';
        if (infoDisplay) {
            infoDisplay.style.display = 'flex'; // flex로 변경하여 중앙 정렬 활성화
            infoDisplay.innerHTML = '';
            if (data.info) {
                Object.entries(data.info).forEach(([key, value]) => {
                    const span = document.createElement('span');
                    if (key === "속성") {
                        span.innerHTML = `<img src="${constants.attributeImageMap[constants.attributeList[value]]}" style="width: 40px; height: 40px; vertical-align: middle;" title="속성: ${constants.attributeList[value]}">`;
                    } else if (key === "포지션") {
                        const imgPath = constants.positionImageMap[value];
                        if (imgPath) {
                            span.innerHTML = `<img src="${imgPath}" style="width: 40px; height: 40px; vertical-align: middle;" title="포지션: ${value}">`;
                        } else {
                            span.innerHTML = `<b>${key}:</b> ${value}`;
                        }
                    } else {
                        span.innerHTML = `<b>${key}:</b> ${value}`;
                    }
                    infoDisplay.appendChild(span);
                });
            }
        }

        if (dom.buffApplicationArea) dom.buffApplicationArea.style.display = 'block';
        if (dom.extraSlidersDiv) dom.extraSlidersDiv.style.display = 'flex';
        if (dom.skillContainer) dom.skillContainer.style.display = 'grid';
        if (dom.newSectionArea) dom.newSectionArea.style.display = 'block';
        
        dom.sliderInput.value = saved.lv || 1;
        dom.extraSlider1.value = saved.s1 || 0;
        dom.extraSlider2.value = saved.s2 || 0;
        
        state.appliedBuffs = {};
        if (data.defaultBuffSkills) data.defaultBuffSkills.forEach(sid => addAppliedBuff(id, sid, true, false, state.appliedBuffs));
        
        if (saved.appliedBuffs) {
            for (const bCharId in saved.appliedBuffs) {
                const buffOwnerData = charData[bCharId];
                if (!buffOwnerData || !buffOwnerData.skills) continue;
                if (!state.appliedBuffs[bCharId]) state.appliedBuffs[bCharId] = [];
                
                saved.appliedBuffs[bCharId].forEach(savedBuff => {
                    const skillExists = buffOwnerData.skills.some(s => s.id === savedBuff.skillId);
                    if (!skillExists) return;
                    
                    const existingIdx = state.appliedBuffs[bCharId].findIndex(b => b.skillId === savedBuff.skillId);
                    if (existingIdx !== -1) {
                        Object.assign(state.appliedBuffs[bCharId][existingIdx], savedBuff);
                    } else {
                        if (savedBuff.isDefault && !charData[state.currentId].defaultBuffSkills?.includes(savedBuff.skillId)) return;
                        state.appliedBuffs[bCharId].push(savedBuff);
                    }
                });
            }
        }
        
        state.damageRecords[id] = saved.damageRecords || [];
        renderSkills(id, charData, state.savedStats, state.currentSkillLevels, dom.skillContainer, logic.updateStats, logic.saveCurrentStats, dom.sliderInput);
        
        setupInitialNewSection(id, data, saved.s1 || 0);
        onExtraSliderChange();
        logic.updateStats();
    }

    // [추가] 스크롤 위치 복원
    requestAnimationFrame(() => {
        const savedScroll = localStorage.getItem(`scrollPos_${id}`);
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll));
        } else {
            window.scrollTo(0, 0);
        }
    });
}

function setupInitialNewSection(id, data, brVal) {
    dom.newSectionArea.innerHTML = `
        <div class="skill-detail-display" style="padding:0; min-height:auto; border-bottom:1px solid #8b4513; margin-bottom:5px;">
            <!-- 초기 상태 탭 유지 -->
            <div style="display: flex; align-items: flex-end; margin-top: -41px; margin-bottom: 15px; margin-left: 0px;">
                <div style="background: #30363d; color: #ffa500; font-size: 0.75em; font-weight: bold; padding: 6px 16px; border-radius: 8px 8px 0 0; border: 1px solid #444; border-bottom: none; z-index: 1; box-shadow: 0 -3px 6px rgba(0,0,0,0.3);">스킬 데미지 계산</div>
            </div>
            <p style="margin:0; color:#888; font-size:0.85em; text-align:center; padding:20px 0;">아이콘을 클릭하여 상세 정보를 확인하세요.</p>
        </div>
        <div style="display:flex; align-items:flex-end; justify-content:space-between; padding-top:2px;">
            <div class="detail-icon-list"></div>
            <div style="display:flex; align-items:flex-end; gap: 10px;">
                <div id="custom-controls-container" style="display: flex; gap: 8px; align-items: flex-end;"></div>
                <div id="global-target-control"></div>
            </div>
        </div>
    `;
    renderSkillIconList(id, brVal, dom, logic);
    renderCustomControls(id, data, logic);
    renderGlobalTargetControl(id, data, logic);
    
    const lastIdx = state.selectedSkillIndex;
    if (lastIdx !== null && data.skills[lastIdx]) updateSkillDetailDisplay(data.skills[lastIdx], lastIdx, dom, logic);
    
    renderDamageRecords(id, dom.newSectionArea, logic.saveCurrentStats);
}

export function setupBuffSearchListeners() {
    dom.buffCharSearch.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        if (!query) { dom.buffSearchResults.style.display = 'none'; return; }
        const matches = Object.keys(charData).filter(id => 
            id !== state.currentId && charData[id].title?.toLowerCase().includes(query)
        );
        renderBuffSearchResults(matches, charData, dom.buffSearchResults, dom.buffCharSearch, dom.buffSkillSelectionArea, displayBuffSkills, state.appliedBuffs, addAppliedBuff, removeAppliedBuff, renderAppliedBuffsDisplay, logic.updateStats, dom.sliderInput, state.currentSkillLevels, getDynamicDesc, state.savedStats, logic.saveCurrentStats);
    });

    // [추가] 엔터 키로 검색 완료
    dom.buffCharSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const firstResult = dom.buffSearchResults.querySelector('div');
            if (firstResult) {
                firstResult.click(); // 검색 결과의 첫 번째 항목 자동 선택
            }
        }
    });
}

function setupSortListeners() {
    const imageRow = document.querySelector('.image-row');
    
    // 필터 실행 공통 함수
    const applyFilter = (type, value = null) => {
        imageRow.querySelectorAll('.main-image').forEach(img => {
            const charId = img.dataset.id;
            if (charId === 'hero') { img.style.display = 'block'; return; }

            if (type === 'all') {
                img.style.display = 'block';
            } else if (type === 'fav') {
                const isFav = state.savedStats[charId]?.isFavorite === true;
                img.style.display = isFav ? 'block' : 'none';
            } else if (type === 'attr') {
                img.style.display = (charData[charId]?.info?.속성 === value) ? 'block' : 'none';
            }
        });
        localStorage.setItem('currentFilter', JSON.stringify({ type, value }));
    };

    document.querySelector('.sort-icon-all')?.addEventListener('click', () => applyFilter('all'));
    
    document.querySelector('.sort-icon-fav')?.addEventListener('click', () => applyFilter('fav'));
    
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.onclick = () => {
            const attr = parseInt(icon.dataset.attr);
            applyFilter('attr', attr);
        };
    });

    // 저장된 필터 복구
    const savedFilter = localStorage.getItem('currentFilter');
    if (savedFilter) {
        const { type, value } = JSON.parse(savedFilter);
        applyFilter(type, value);
    }
}

export function resetToInitialState() {
    localStorage.removeItem('lastSelectedCharId');
    location.reload();
}

export function setupDragScroll(slider, storageKey = null) {
    let isDown = false, startX, scrollLeft;
    
    // 저장된 스크롤 위치 복구 (키가 있을 때만)
    if (storageKey) {
        const savedScrollPos = localStorage.getItem(storageKey);
        if (savedScrollPos) {
            slider.scrollLeft = parseInt(savedScrollPos);
        }
    }

    slider.onmousedown = e => { 
        isDown = true; 
        slider.style.cursor = 'grabbing'; // 드래그 중 커서 변경
        startX = e.pageX - slider.offsetLeft; 
        scrollLeft = slider.scrollLeft; 
    };
    slider.onmouseup = () => { isDown = false; slider.style.cursor = 'grab'; };
    slider.onmouseleave = () => { isDown = false; slider.style.cursor = 'grab'; };
    slider.onmousemove = e => { 
        if (!isDown) return; 
        const x = e.pageX - slider.offsetLeft; 
        slider.scrollLeft = scrollLeft - (x - startX) * 0.8; // 감도 조절
        
        // 위치 저장 (키가 있을 때만)
        if (storageKey) {
            localStorage.setItem(storageKey, slider.scrollLeft);
        }
    };

    // 마우스 휠 또는 터치 스크롤 시에도 저장 (키가 있을 때만)
    slider.addEventListener('scroll', () => {
        if (!isDown && storageKey) {
            localStorage.setItem(storageKey, slider.scrollLeft);
        }
    });
}
