// handlers.js (가장 안정적이었던 로직으로 수동 복구)
import { state, constants } from './state.js';
import { charData } from './data.js';
import { updateSkillStatesByBreakthrough } from './breakthrough.js';
import { renderBuffSearchResults, displayBuffSkills, renderAppliedBuffsDisplay } from './ui.js';
import { renderSkills } from './render-skills.js';
import { addAppliedBuff, removeAppliedBuff } from './buffs.js';
import { getDynamicDesc } from './formatter.js';
import { updateSkillDetailDisplay, renderGlobalTargetControl, renderSkillIconList, renderCustomControls } from './detail-view.js';
import { renderDamageRecords } from './records.js';
import { backgroundConfigs } from './background-configs.js';

let dom = {};
let logic = {};

// [신규] 배경 적용 함수 분리 (외부 호출 가능하도록)
function applyBackground(charId, favStatus) {
    const charBg = document.getElementById('internal-char-bg');
    const bgImg = document.getElementById('char-bg-img'); 
    
    if (favStatus && bgImg) {
        const def = backgroundConfigs["default"], spec = backgroundConfigs[charId] || {};
        
        const config = {
            mobile: { ...def.mobile, ...(spec.mobile || {}) },
            tablet: { ...def.tablet, ...(spec.tablet || {}) },
            pc:     { ...def.pc,     ...(spec.pc || {}) }
        };

        bgImg.src = `images/background/${charId}.webp`;
        bgImg.style.display = 'block';

        const width = window.innerWidth;
        let currentConfig, baseSize;

        if (width <= 600) {
            currentConfig = config.mobile;
            baseSize = 550;
        } else if (width <= 1100) {
            currentConfig = config.tablet;
            baseSize = 750;
        } else {
            currentConfig = config.pc;
            baseSize = 900;
        }

        const finalSize = baseSize * currentConfig.scale;
        bgImg.style.height = `${finalSize}px`;

        if (width <= 600) {
            const fixedHeight = window.outerHeight; 
            const topPos = fixedHeight - finalSize + 60; 
            bgImg.style.top = `${topPos}px`;
            bgImg.style.bottom = 'auto';
        } else {
            bgImg.style.top = 'auto';
            bgImg.style.bottom = '0';
        }

        let finalXOffset = currentConfig.xOffset || 0;
        if (width > 1100) finalXOffset += 200;

        // console.log('applyBackground Debug:', { charId, width, config: currentConfig, finalXOffset });

        bgImg.style.transform = `translateX(${finalXOffset}px)`;
        
        if (charBg) {
            charBg.classList.remove('animate');
            void charBg.offsetWidth;
            charBg.classList.add('animate');
        }
    } else if (bgImg) { 
        bgImg.style.display = 'none';
        bgImg.src = '';
        if (charBg) charBg.classList.remove('animate');
    }
}

export function initHandlers(domElements, logicFunctions) {
    dom = domElements;
    logic = logicFunctions;
    setupSortListeners();
    setupHeaderListeners();

    // [고정] 모바일 배경 덜컥거림 방지: 실행 시점의 높이를 픽셀로 고정
    const setFixedBgHeight = () => {
        const height = Math.max(window.screen.height, window.innerHeight) + 100;
        document.documentElement.style.setProperty('--fixed-bg-height', `${height}px`);
    };
    setFixedBgHeight();
    // 화면 회전 시에만 높이 재설정 (주소창 resize는 무시)
    window.addEventListener('orientationchange', () => setTimeout(setFixedBgHeight, 200));

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

    // [신규] 헤더 바로가기 아이콘 이벤트 연결
    document.querySelectorAll('.header-shortcut-icon').forEach(icon => {
        icon.onclick = (e) => {
            e.stopPropagation();
            const targetId = icon.dataset.id;
            
            if (targetId === 'char-list') {
                // [수정] 상세 페이지에서 목록 아이콘 클릭 시 히스토리 중복 방지
                const currentState = history.state?.id;
                if (currentState !== 'main' && currentState !== 'char-list') {
                    // 상세 페이지 상태를 목록 상태로 교체 (계층 구조 유지)
                    history.replaceState({ id: 'char-list' }, "", window.location.pathname);
                } else if (currentState === 'main') {
                    history.pushState({ id: 'char-list' }, "", window.location.pathname);
                }
                
                // UI 전환
                const lArea = document.getElementById('landing-char-list-area');
                const lGroup = document.getElementById('landing-menu-group');
                const isLanding = document.body.classList.contains('landing-page-active');
                
                if (!isLanding) {
                    window.forceGoToMainUI();
                }
                if (lArea) lArea.style.display = 'block';
                if (lGroup) lGroup.style.display = 'none';
                
                // 그리드 렌더링 확인
                const landingCharGrid = document.getElementById('landing-char-grid');
                if (landingCharGrid && landingCharGrid.children.length === 0) {
                    const landingRandomCharBtn = document.getElementById('landing-char-list-btn');
                    if (landingRandomCharBtn) {
                        // 원본 클릭 이벤트 실행 (UI만 업데이트하도록)
                        const originalOnClick = landingRandomCharBtn.onclick;
                        if (originalOnClick) originalOnClick();
                    }
                }
                return;
            }

            let targetBtn = document.querySelector(`.main-image[data-id="${targetId}"]`);
            
            // [수정] 캐릭터 탭에서 시뮬레이터로 바로 이동 시 처리
            if (targetId === 'simulator' && state.currentId && !['hero', 'simulator'].includes(state.currentId)) {
                // 현재 상태 저장
                if (typeof logic.saveCurrentStats === 'function') {
                    logic.saveCurrentStats();
                }
                localStorage.setItem('sim_last_char_id', state.currentId.trim());
                
                // [핵심] 별도의 import 없이, 이미 존재하는 메뉴 탭의 클릭 이벤트를 그대로 활용
                const originalSimBtn = document.querySelector(`.main-image[data-id="simulator"]`);
                if (originalSimBtn) {
                    handleImageClick(originalSimBtn);
                    return; 
                }
            }

            // [수정] 대상 버튼이 없으면(목록에 없는 hero/simulator 등) 가짜 객체 생성하여 전달
            if (!targetBtn) {
                targetBtn = {
                    dataset: { id: targetId },
                    classList: {
                        add: () => {},
                        remove: () => {},
                        contains: () => false,
                        toggle: () => {}
                    },
                    scrollIntoView: () => {},
                    style: {}
                };
            }

            handleImageClick(targetBtn);
        };
    });

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

    // [신규] 리사이즈 임계점 감지용 변수
    let lastWidth = window.innerWidth;

    window.addEventListener('resize', () => {
        const currentWidth = window.innerWidth;
        setFixedBgHeight(); // 배경 높이 즉시 갱신

        // 임계점(600px, 1100px)을 넘나들 때 레이아웃 및 그래프 즉시 재렌더링
        const crossedMobile = (lastWidth <= 600 && currentWidth > 600) || (lastWidth > 600 && currentWidth <= 600);
        const crossedPC = (lastWidth <= 1100 && currentWidth > 1100) || (lastWidth > 1100 && currentWidth <= 1100);

        if (crossedMobile || crossedPC) {
            if (state.currentId === 'hero') {
                import(`./hero-tab.js?v=20260313`).then(mod => {
                    mod.clearHeroTabRemnants();
                    mod.renderHeroTab(dom, logic.updateStats);
                });
            } else if (state.currentId === 'simulator') {
                import(`./simulator.js?v=20260313`).then(mod => {
                    // 시뮬레이터는 가로세로 비율 왜곡 방지를 위해 전체 UI 다시 그리기 권장
                    mod.initSimulator(); 
                });
            }
        }
        
        // [추가] 리사이즈 시 배경 이미지 설정 즉시 갱신 (캐릭터 탭일 때)
        // 단, 모바일(600px 이하)에서는 주소창 resize로 인한 덜컥거림 방지를 위해 호출하지 않음
        if (currentWidth > 600 && state.currentId && !['hero', 'simulator'].includes(state.currentId)) {
            const isFav = state.savedStats[state.currentId]?.isFavorite;
            if (isFav) {
                applyBackground(state.currentId, true);
            }
        }
        
        lastWidth = currentWidth;

        // 캐릭터 탭인 경우 스탯 및 배경 위치 즉시 갱신
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

// [신규] 메인 메뉴 UI로 강제 전환하는 순수 UI 함수
window.forceGoToMainUI = function() {
    state.currentId = null;
    localStorage.removeItem('lastSelectedCharId');
    window.scrollTo(0, 0);

    document.body.classList.remove('hero-mode-active', 'char-page-active', 'sub-page-active');
    document.body.classList.add('landing-page-active');
    
    const contentDisplay = document.getElementById('content-display');
    if (contentDisplay) { 
        contentDisplay.className = 'landing-mode'; 
        contentDisplay.style.removeProperty('--bg-url');
    }

    hideAllSections();
    const landingPage = document.getElementById('landing-page');
    if (landingPage) {
        landingPage.style.setProperty('display', 'block', 'important');
        const menuGroup = document.getElementById('landing-menu-group');
        const charListArea = document.getElementById('landing-char-list-area');
        if (menuGroup) menuGroup.style.display = 'flex';
        if (charListArea) charListArea.style.display = 'none';
    }
    const mainCol = document.querySelector('.main-content-column');
    if (mainCol) mainCol.style.setProperty('display', 'block', 'important');
    
    import('./hero-tab.js').then(mod => mod.clearHeroTabRemnants());
    document.querySelector('.main-image.selected')?.classList.remove('selected');
    forceMainHeader();
    logic.updateStats();
};

function setupHeaderListeners() {
    const toggleIcon = document.getElementById('header-toggle-icon');
    if (toggleIcon) {
        toggleIcon.onclick = () => {
            const headerTitle = document.getElementById('sticky-header-title');
            if (headerTitle) headerTitle.click();
        };
    }

    const headerTitle = document.getElementById('sticky-header-title');
    if (headerTitle) {
        headerTitle.onclick = () => {
            const isLanding = document.body.classList.contains('landing-page-active');
            const menuGroupVisible = document.getElementById('landing-menu-group')?.style.display !== 'none';
            
            // 이미 메인 메뉴 상태라면 무시
            if (isLanding && menuGroupVisible) return;

            const currentState = history.state?.id;
            // [수정] 상세 페이지에서 홈으로 갈 때는 기록을 교체하여 '뒤로가기' 시 사이트 밖으로 나가게 함 (홈이 최상위이므로)
            if (currentState && currentState !== 'main' && currentState !== 'char-list') {
                history.replaceState({ id: 'main' }, "", window.location.pathname);
            } else if (currentState !== 'main') {
                history.pushState({ id: 'main' }, "", window.location.pathname);
            }

            window.forceGoToMainUI();
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
    if (stickyAttr) stickyAttr.onclick = () => {
        const headerTitle = document.getElementById('sticky-header-title');
        if (headerTitle) headerTitle.click();
    };
    document.getElementById('sticky-lv')?.addEventListener('click', () => cycleValue(dom.sliderInput, 1, 60, 5));
    document.getElementById('sticky-br')?.addEventListener('click', () => cycleThresholds(dom.extraSlider1, [0, 5, 15, 30, 50, 75]));
    document.getElementById('sticky-fit')?.addEventListener('click', () => cycleValue(dom.extraSlider2, 0, 5, 1));
    document.getElementById('br-up-btn')?.addEventListener('click', () => adjustSlider(dom.extraSlider1, 1, 75));
    document.getElementById('br-down-btn')?.addEventListener('click', () => adjustSlider(dom.extraSlider1, -1, 75));
}

export function forceMainHeader() {
    const headerTitle = document.getElementById('sticky-header-title');
    const toggleIcon = document.getElementById('header-toggle-icon');
    const shortcuts = document.getElementById('header-shortcuts'); // [추가]

    if (toggleIcon) { toggleIcon.style.setProperty('display', 'block', 'important'); }
    if (headerTitle) { headerTitle.style.setProperty('display', 'flex', 'important'); headerTitle.innerHTML = `동여성 공방`; }
    if (shortcuts) { shortcuts.style.setProperty('display', 'flex', 'important'); } // [추가]

    ['sticky-name', 'sticky-attr', 'sticky-lv', 'sticky-br', 'sticky-fit'].forEach(id => { const el = document.getElementById(id); if (el) { el.style.setProperty('display', 'none', 'important'); el.innerText = ''; } });
}

export function hideAllSections() {
    const ids = ['landing-page', 'simulator-page', 'new-section-area', 'buff-application-area', 'skill-container', 'calc-and-stats-row', 'sub-stats-wrapper', 'info-display'];
    ids.forEach(id => { const el = document.getElementById(id); if (el) el.style.setProperty('display', 'none', 'important'); });
    
    // [추가] 랜딩 페이지 모드 초기화
    const menuGroup = document.getElementById('landing-menu-group');
    const charListArea = document.getElementById('landing-char-list-area');
    if (menuGroup) menuGroup.style.display = 'flex';
    if (charListArea) charListArea.style.display = 'none';

    const mainCol = document.querySelector('.main-content-column');
    const sideCol = document.querySelector('.side-content-column');
    if (mainCol) mainCol.style.setProperty('display', 'none', 'important');
    if (sideCol) sideCol.style.setProperty('display', 'none', 'important');
    const charHeader = document.querySelector('.char-header-row');
    if (charHeader) charHeader.style.setProperty('display', 'none', 'important');

    // [추가] 캐릭터 전용 UI 요소 초기화
    const favBtn = document.querySelector('.char-fav-btn');
    const simShortcutBtn = document.querySelector('.sim-shortcut-btn');
    const reportShortcutBtn = document.querySelector('.char-report-btn');
    const charBgImg = document.getElementById('char-bg-img');
    const charBgContainer = document.getElementById('internal-char-bg');
    const gradeLogo = document.getElementById('char-grade-logo');
    
    if (favBtn) favBtn.style.setProperty('display', 'none', 'important');
    if (simShortcutBtn) simShortcutBtn.style.setProperty('display', 'none', 'important');
    if (reportShortcutBtn) reportShortcutBtn.style.setProperty('display', 'none', 'important');
    if (gradeLogo) gradeLogo.style.display = 'none';
    if (charBgImg) {
        charBgImg.style.display = 'none';
        charBgImg.src = '';
    }
    if (charBgContainer) charBgContainer.classList.remove('animate');

    const contentDisplay = document.getElementById('content-display');
    if (contentDisplay) {
        contentDisplay.style.removeProperty('display'); // [추가] 인라인 display 스타일 제거 (그리드 복구용)
        contentDisplay.style.setProperty('--bg-url', 'none');
        contentDisplay.style.removeProperty('--bg-align-mob');
        contentDisplay.style.removeProperty('--bg-x-mob');
        contentDisplay.style.removeProperty('--bg-y-mob');
        contentDisplay.style.removeProperty('--bg-size-mob');
    }
}

export function handleImageClick(img, pushHistory = true) {
    const id = img.dataset.id;
    if (!id) return;

    // 4. 히스토리 기록 (선택 사항)
    if (pushHistory) {
        const currentState = history.state || {};
        const currentId = currentState.id;
        const currentSubId = (currentId === 'simulator') ? (currentState.subId || 'list') : null;
        
        const targetId = id;
        const targetSubId = (targetId === 'simulator') ? (localStorage.getItem('sim_last_char_id') || 'list') : null;
        const newState = targetSubId ? { id: targetId, subId: targetSubId } : { id: targetId };

        // [핵심 로직]
        // 1. 동일 캐릭터 내에서의 탭 전환인지 확인 (예: Sim A <-> Detail A)
        const isSameCharTabSwitch = 
            (currentId === 'simulator' && currentSubId === targetId) || 
            (targetId === 'simulator' && targetSubId === currentId && currentId !== 'char-list' && currentId !== 'main');

        // 2. 이미 캐릭터 상세나 시뮬 상세를 보고 있는 상태인지 (목록 제외)
        const isCurrentlyViewingChar = currentId && currentId !== 'main' && currentId !== 'char-list' && (currentId !== 'simulator' || currentSubId !== 'list');

        if (isSameCharTabSwitch) {
            // 동일 캐릭터 간 탭 이동은 기록을 남김 (뒤로가기 시 직전 탭으로)
            history.pushState(newState, "", window.location.pathname);
        } else if (isCurrentlyViewingChar) {
            // 다른 캐릭터로 변경 시: [현재 상세]를 [해당 모드 목록]으로 교체한 후 [새 상세] 추가
            // 이렇게 하면 뒤로가기 시 이전 캐릭터를 건너뛰고 목록으로 바로 감
            const gridState = (targetId === 'simulator') ? { id: 'simulator', subId: 'list' } : { id: 'char-list' };
            history.replaceState(gridState, "", window.location.pathname);
            history.pushState(newState, "", window.location.pathname);
        } else {
            // 메인이나 목록 그리드에서 처음 진입할 때
            if (currentId !== targetId || (targetId === 'simulator' && currentSubId !== targetSubId)) {
                if (currentId === 'main' && targetId !== 'char-list' && targetId !== 'simulator') {
                    history.pushState({ id: 'char-list' }, "", window.location.pathname);
                }
                history.pushState(newState, "", window.location.pathname);
            }
        }
    }
    
    // [수정] 스크롤 위치 복원 로직
    const savedScroll = localStorage.getItem(`scroll_pos_${id}`);
    if (savedScroll) {
        // 약간의 지연 후 스크롤 복원 (DOM 렌더링 대기)
        setTimeout(() => window.scrollTo(0, parseInt(savedScroll)), 0);
    } else {
        window.scrollTo(0, 0);
    }
    
    // [보강] 모든 페이지 상태 클래스 초기화 후 현재 상태 적용
    document.body.classList.remove('landing-page-active', 'hero-mode-active', 'char-page-active');
    document.body.classList.add('sub-page-active');
    
    document.querySelector('.main-image.selected')?.classList.remove('selected');
    img.classList.add('selected');
    img.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    state.currentId = id;
    const contentDisplay = document.getElementById('content-display');
    if (contentDisplay) { contentDisplay.setAttribute('data-char-id', id); }
    hideAllSections();

    if (id === 'hero') {
        contentDisplay.className = 'hero-mode'; 
        document.body.classList.add('hero-mode-active'); // 히어로/시뮬 공통 클래스
        forceMainHeader();
        import(`./hero-tab.js?v=20260313`).then(mod => { mod.clearHeroTabRemnants(); mod.renderHeroTab(dom, logic.updateStats); });
    } else if (id === 'simulator') {
        contentDisplay.className = 'hero-mode';
        document.body.classList.add('hero-mode-active'); // 히어로/시뮬 공통 클래스
        document.querySelector('.main-content-column').style.setProperty('display', 'block', 'important');
        document.getElementById('simulator-page').style.setProperty('display', 'block', 'important');
        forceMainHeader();
        import(`./hero-tab.js?v=20260313`).then(mod => mod.clearHeroTabRemnants());
        import(`./simulator.js?v=20260313`).then(mod => mod.initSimulator());
    } else {
        document.body.classList.add('char-page-active'); // [추가] 일반 캐릭터 탭 전용 클래스
        contentDisplay.className = '';
        const charHeader = document.querySelector('.char-header-row');
        if (charHeader) charHeader.style.setProperty('display', 'block', 'important');
        
        // [추가] 캐릭터 상세 진입 시 헤더 바로가기 아이콘 숨김
        const shortcuts = document.getElementById('header-shortcuts');
        if (shortcuts) shortcuts.style.setProperty('display', 'none', 'important');

        const mainCol = document.querySelector('.main-content-column');
        const sideCol = document.querySelector('.side-content-column');
        if (mainCol) mainCol.style.setProperty('display', 'block', 'important');
        if (sideCol) sideCol.style.setProperty('display', 'block', 'important');
        
        const show = (target, type = 'block') => { const el = document.getElementById(target); if (el) el.style.setProperty('display', type, 'important'); };
        ['new-section-area', 'buff-application-area', 'info-display', 'calc-area', 'bonus-sliders', 'sub-stats-wrapper'].forEach(s => show(s));
        
        const data = charData[id], saved = state.savedStats[id] || {};

        // [수정] 속성 초기화: 저장된 값이 없으면 캐릭터 본래 속성으로 설정
        if (saved.currentDisplayedAttribute) {
            state.currentDisplayedAttribute = saved.currentDisplayedAttribute;
        } else if (data.info && data.info.속성 !== undefined) {
            // 속성 인덱스(0~4)를 문자열("불", "물" 등)로 변환
            const attrList = ["불", "물", "나무", "빛", "어둠"];
            state.currentDisplayedAttribute = attrList[data.info.속성] || '불';
        }

        // 상세 정보 영역 기본 뼈대 주입
        if (dom.newSectionArea) {
            const initialIdx = saved.lastSelectedSkillIndex;
            
            dom.newSectionArea.innerHTML = `
                <div class="skill-detail-display">
                    ${initialIdx === undefined ? `
                        <div class="skill-detail-tab-tag">
                            <div class="skill-detail-tab-content">스킬 데미지 계산</div>
                        </div>
                        <div style="text-align:center; padding: 30px 20px; color: #aaa; font-size: 0.85em; font-weight: bold;">
                            <img src="icon/main.png" style="width: 24px; opacity: 0.3; margin-bottom: 8px; display: block; margin-left: auto; margin-right: auto;">
                            분석할 스킬 아이콘을 클릭하세요
                        </div>
                    ` : ''}
                </div>
                <div class="icon-list-row">
                    <div class="detail-icon-list"></div>
                    <div class="controls-wrapper">
                        <div id="global-target-control"></div>
                        <div id="custom-controls-container" style="display: flex; gap: 10px;"></div>
                    </div>
                </div>
            `;
            
            // 저장된 기록이 있을 때만 즉시 렌더링
            if (initialIdx !== undefined && data.skills && data.skills[initialIdx]) {
                state.selectedSkillIndex = initialIdx;
                state.selectedIsExternal = false;
                updateSkillDetailDisplay(data.skills[initialIdx], initialIdx, dom, logic);
            } else {
                state.selectedSkillIndex = null;
                state.selectedIsExternal = false;
            }
        }

        if (charHeader) {
            const infoDisplay = document.getElementById('info-display');
            if (infoDisplay) infoDisplay.style.setProperty('display', 'flex', 'important');
        }

        show('skill-container', 'grid'); show('calc-and-stats-row', 'flex');
        
        const favBtn = document.querySelector('#content-display .char-fav-btn');
        const simShortcutBtn = document.querySelector('#content-display .sim-shortcut-btn');
        const reportShortcutBtn = document.querySelector('#content-display .char-report-btn');

        if (simShortcutBtn) {
            // [수정] 비활성화 목록에 있는 캐릭터는 버튼 숨김
            if (constants.disabledSimChars.includes(id)) {
                simShortcutBtn.style.setProperty('display', 'none', 'important');
            } else {
                simShortcutBtn.style.display = 'flex'; // 다시 보이기
                simShortcutBtn.onclick = (e) => {
                    e.stopPropagation();
                    localStorage.setItem('sim_last_char_id', id);
                    
                    let simBtn = document.querySelector('.main-image[data-id="simulator"]');
                    if (!simBtn) {
                        simBtn = {
                            dataset: { id: 'simulator' },
                            classList: {
                                add: () => {},
                                remove: () => {},
                                contains: () => false,
                                toggle: () => {}
                            },
                            scrollIntoView: () => {},
                            style: {}
                        };
                    }
                    handleImageClick(simBtn);
                };
            }
        }

        if (reportShortcutBtn) {
            reportShortcutBtn.style.display = 'flex';
            reportShortcutBtn.onclick = (e) => {
                e.stopPropagation();
                const modal = document.getElementById('char-report-modal');
                const body = document.getElementById('report-modal-body');
                if (modal && body) {
                    body.innerHTML = `<div style="text-align:center;"><img src="images/report/${id}.webp" style="width:100%; max-width:100%; border-radius:4px;" onerror="this.onerror=null; this.parentElement.innerHTML='<p style=padding:40px;color:#999;>보고서 이미지가 준비되지 않았습니다.</p>';"></div>`;
                    modal.style.display = 'flex';
                    
                    // [추가] 모달 열 때 히스토리 추가
                    history.pushState({ id: 'modal', modalId: 'char-report-modal' }, "", window.location.pathname);

                    const topCloseBtn = document.getElementById('report-modal-top-close-btn');
                    const closeModal = () => { 
                        if (modal.style.display === 'flex') {
                            modal.style.display = 'none'; 
                            body.innerHTML = ''; 
                            if (history.state?.id === 'modal') history.back();
                        }
                    };
                    if (topCloseBtn) topCloseBtn.onclick = closeModal;
                    modal.onclick = (ev) => { if (ev.target === modal) closeModal(); };
                }
            };
        }

        if (favBtn) {
            const isFav = saved.isFavorite || false;
            favBtn.style.display = 'flex';
            favBtn.className = `char-fav-btn ${isFav ? 'active' : ''}`;
            favBtn.innerText = isFav ? '★' : '☆';
            favBtn.onclick = (e) => {
                e.stopPropagation();
                const nowFav = !favBtn.classList.contains('active');
                favBtn.classList.toggle('active', nowFav);
                favBtn.innerText = nowFav ? '★' : '☆';
                if (!state.savedStats[id]) state.savedStats[id] = {};
                state.savedStats[id].isFavorite = nowFav;
                applyBackground(id, nowFav);
                logic.saveCurrentStats();
            };
            applyBackground(id, isFav);
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
        onExtraSliderChange(); logic.updateStats();
    }
    logic.saveCurrentStats();
}

function cycleValue(slider, min, max, step) { let val = parseInt(slider.value); let next = (val < step && step > 1) ? step : (Math.floor(val / step) * step + step); if (next > max) next = min; slider.value = next; onExtraSliderChange(); }
function cycleThresholds(slider, thresholds) { let val = parseInt(slider.value); let next = thresholds.find(t => t > val); slider.value = next !== undefined ? next : thresholds[0]; onExtraSliderChange(); }
function adjustSlider(slider, delta, max) { let val = parseInt(slider.value) + delta; if (val >= 0 && val <= max) { slider.value = val; onExtraSliderChange(); } }

export function setupSortListeners() {
    const imageRow = document.querySelector('.image-row');
    const applyFilter = (type, value = null) => {
        imageRow.querySelectorAll('.main-image').forEach(img => { 
            const charId = img.dataset.id;
            
            // 래퍼가 있으면 래퍼를 제어, 없으면 이미지 자체를 제어
            const hasWrapper = img.parentElement.classList.contains('char-slot-wrapper');
            const target = hasWrapper ? img.parentElement : img;
            
            if (charId === 'hero' || charId === 'simulator') { 
                target.style.display = hasWrapper ? 'flex' : 'block'; 
                return; 
            }
            
            let isVisible = false;
            if (type === 'all') isVisible = true; 
            else if (type === 'fav') isVisible = state.savedStats[charId]?.isFavorite; 
            else if (type === 'attr') isVisible = (charData[charId]?.info?.속성 === value);
            
            target.style.display = isVisible ? (hasWrapper ? 'flex' : 'block') : 'none';
        });
    };
    document.querySelector('.sort-icon-all')?.addEventListener('click', () => applyFilter('all')); document.querySelector('.sort-icon-fav')?.addEventListener('click', () => applyFilter('fav'));
    document.querySelectorAll('.sort-icon').forEach(icon => { icon.onclick = () => applyFilter('attr', parseInt(icon.dataset.attr)); });
}

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
    
    // [신규] 모든 모달 및 툴팁을 닫는 공통 함수
    export function closeAllModals() {
        // 1. 일반 모달들
        const modalIds = ['cloud-save-modal', 'report-modal', 'char-report-modal'];
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) modal.style.display = 'none';
        });
    
        // 2. 시뮬레이터 상세 로그 모달 (클래스 기반)
        document.querySelectorAll('.sim-detailed-log-modal').forEach(el => el.remove());
    
        // 3. 툴팁들 (DOM에서 직접 제거)
        document.querySelectorAll('.buff-tooltip, .simple-tooltip').forEach(el => el.remove());
        
        // 4. 캐릭터 보고서 본문 비우기 (메모리 해제 및 잔상 방지)
        const reportBody = document.getElementById('report-modal-body');
        if (reportBody) reportBody.innerHTML = '';
    }
    