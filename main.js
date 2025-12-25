// main.js

import { renderBuffSearchResults, displayBuffSkills, renderAppliedBuffsDisplay, setFormattedDesc } from './ui.js';
import { getDynamicDesc } from './formatter.js';
import { addAppliedBuff, removeAppliedBuff } from './buffs.js';
import { state, constants } from './state.js';
import { charData } from './data.js'; // 추가
import { initLogic, updateStats, saveCurrentStats, updateCharacterListIndicators } from './logic.js?v=100';
import { initHandlers, onExtraSliderChange, handleImageClick, setupDragScroll, setupBuffSearchListeners } from './handlers.js?v=100';
import { initSecretModule, initCloudSharing } from './secret.js';

document.addEventListener('DOMContentLoaded', function() {
    // 1. DOM 요소 선택
    const dom = {
        images: document.querySelectorAll('.main-image'),
        titleArea: document.getElementById('display-title'),
        statsWrapper: document.getElementById('stats-wrapper'),
        statsArea: document.getElementById('display-stats'),
        sliderInput: document.getElementById('level-slider'),
        levelVal: document.getElementById('level-val'),
        calcArea: document.getElementById('calc-area'),
        extraSlidersDiv: document.getElementById('bonus-sliders'),
        extraSlider1: document.getElementById('extra1-slider'),
        extraVal1: document.getElementById('extra1-val'),
        extraSlider2: document.getElementById('extra2-slider'),
        extraVal2: document.getElementById('extra2-val'),
        skillContainer: document.getElementById('skill-container'),
        buffApplicationArea: document.getElementById('buff-application-area'),
        buffCharSearch: document.getElementById('buff-char-search'),
        buffSearchResults: document.getElementById('buff-search-results'),
        buffSkillSelectionArea: document.getElementById('buff-skill-selection-area'),
        currentlyAppliedBuffsDiv: document.getElementById('currently-applied-buffs'),
        appliedBuffsList: document.getElementById('applied-buffs-list'),
        newSectionArea: document.getElementById('new-section-area'),
        imageRow: document.querySelector('.image-row')
    };

    // 2. 모듈 초기화 (DOM 주입)
    initLogic(dom);
    initHandlers(dom, { updateStats, saveCurrentStats });
    initSecretModule(); // 비밀 모듈 초기화
    initCloudSharing(); // [추가] 클라우드 공유 모듈 초기화

    // 3. 이벤트 리스너 연결

    // 레벨 슬라이더
    dom.sliderInput.addEventListener('input', function() {
        dom.levelVal.innerText = this.value;
        if (state.currentId) {
            updateStats();
            saveCurrentStats();
        }
    });

    // 보너스 슬라이더
    dom.extraSlider1.addEventListener('input', onExtraSliderChange);
    dom.extraSlider2.addEventListener('input', onExtraSliderChange);

    // 캐릭터 이미지 클릭
    dom.images.forEach(img => {
        img.addEventListener('click', () => handleImageClick(img));
        img.addEventListener('dragstart', (e) => e.preventDefault()); // 이미지 드래그 방지
    });

    // 드래그 스크롤
    setupDragScroll(dom.imageRow, 'charListScrollLeft');

    // 버프 검색 관련
    setupBuffSearchListeners();

    // [추가] 초기화면 리셋 버튼
    const landingResetBtn = document.getElementById('landing-reset-btn');
    if (landingResetBtn) {
        landingResetBtn.addEventListener('click', () => {
            if (confirm('모든 캐릭터의 스탯, 기록, 버프 설정이 초기화됩니다. 정말 진행하시겠습니까?')) {
                localStorage.clear();
                alert('데이터가 완전히 초기화되었습니다. 페이지를 새로고침합니다.');
                location.reload();
            }
        });
    }

    // [추가] 버프 초기화 버튼
    const resetBuffsBtn = document.getElementById('reset-buffs-btn');
    if (resetBuffsBtn) {
        resetBuffsBtn.addEventListener('click', () => {
            if (state.currentId && confirm('현재 캐릭터의 모든 버프를 초기화하시겠습니까? (외부 버프 찌꺼기 제거)')) {
                state.appliedBuffs = {};
                // 데이터 파일에서 기본 버프 다시 로드
                const data = charData[state.currentId];
                if (data && data.defaultBuffSkills) {
                    data.defaultBuffSkills.forEach(skillId => {
                        addAppliedBuff(state.currentId, skillId, true, false, state.appliedBuffs);
                    });
                }
                updateStats();
                saveCurrentStats();
                alert('버프가 초기화되었습니다.');
            }
        });
    }

    // 캐릭터 목록 토글 버튼
    const listToggleBtn = document.getElementById('char-list-toggle-btn');
    if (listToggleBtn) {
        listToggleBtn.addEventListener('click', () => {
            const listContainer = document.getElementById('char-list-container');
            const isHidden = listContainer.classList.toggle('hidden');
            document.body.classList.toggle('list-open', !isHidden);
            
            // 상태 저장
            localStorage.setItem('charListHidden', isHidden);
        });
    }

    // 초기 상태 설정 (저장된 상태 불러오기)
    const isListHidden = localStorage.getItem('charListHidden') === 'true';
    const listContainer = document.getElementById('char-list-container');
    if (isListHidden) {
        listContainer.classList.add('hidden');
        document.body.classList.remove('list-open');
    } else {
        listContainer.classList.remove('hidden');
        document.body.classList.add('list-open');
    }

    // 4. 초기화 실행
    const lastCharId = localStorage.getItem('lastSelectedCharId');
    if (lastCharId) {
        const initialImage = document.querySelector(`.main-image[data-id="${lastCharId}"]`);
        if (initialImage) {
            handleImageClick(initialImage);
        } else {
            updateStats();
        }
    } else {
        updateStats();
    }

    // 변경 사항 표시 업데이트
    updateCharacterListIndicators();
});