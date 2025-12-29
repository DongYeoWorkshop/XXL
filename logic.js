// logic.js
import { calculateCharacterStats, calculateDamage } from './calculations.js';
import { getSkillMultiplier, getDynamicDesc } from './formatter.js';
import { renderAppliedBuffsDisplay, setFormattedDesc, showToast, showSimpleTooltip } from './ui.js';
import { saveCharacterStats } from './storage.js';
import { getDisabledSkillIds, updateSkillStatesByBreakthrough } from './breakthrough.js';
import { state, constants } from './state.js';
import { charData } from './data.js';
import { getFormattedDamage } from './damage-calculator.js';
import { renderHeroTab, clearHeroTabRemnants } from './hero-tab.js';

let dom = {};

export function initLogic(domElements) {
    dom = domElements;
}

export function saveCurrentStats() {
    if (!state.currentId) return;
    
    // 모든 탭 ID(캐릭터, hero, simulator)를 마지막 선택 상태로 저장
    localStorage.setItem('lastSelectedCharId', state.currentId);
    
    if (state.currentId === 'hero' || state.currentId === 'simulator') return;

    if (!state.savedStats[state.currentId]) state.savedStats[state.currentId] = {};
    const char = state.savedStats[state.currentId];
    char.lv = dom.sliderInput.value;
    char.s1 = dom.extraSlider1.value;
    char.s2 = dom.extraSlider2.value;

    const charSkills = {};
    for (let i = 1; i <= 7; i++) {
        const slider = document.getElementById(`skill-slider-${state.currentId}-${i}`);
        if (slider) charSkills[`s${i}`] = slider.value;
    }
    char.skills = charSkills;
    char.stamp = document.getElementById(`stamp-check-${state.currentId}`)?.checked || false;

    const activeSkills = [];
    dom.skillContainer.querySelectorAll('.skill-card.active').forEach(card => {
        if (!card.classList.contains('always-open')) activeSkills.push(parseInt(card.dataset.skillIndex));
    });
    char.activeSkills = activeSkills;
    char.appliedBuffs = state.appliedBuffs; 
    char.damageRecords = state.damageRecords[state.currentId] || [];
    
    if (!char.customValues) char.customValues = {};
    
    // [추가] 캐릭터 탭의 모든 customSlider / customCounter 값 읽어와 저장
    const customInputs = dom.skillContainer.querySelectorAll('.skill-custom-input');
    customInputs.forEach(input => {
        const key = input.dataset.key;
        if (key) char.customValues[key] = parseInt(input.value);
    });

    saveCharacterStats(state.currentId, char);
    updateCharacterListIndicators();
}

export function updateCharacterListIndicators() {
    document.querySelectorAll('.main-image').forEach(img => {
        const id = img.dataset.id;
        if (!id || id === 'hero') return;
        const saved = state.savedStats[id];
        let isModified = false;
        if (saved) {
            const isLvDefault = (parseInt(saved.lv || 1) === 1);
            const isS1Default = (parseInt(saved.s1 || 0) === 0);
            const isS2Default = (parseInt(saved.s2 || 0) === 0);
            let areSkillsDefault = true;
            if (saved.skills) areSkillsDefault = Object.values(saved.skills).every(val => parseInt(val) === 1);
            const isStampDefault = (saved.stamp === false);
            if (!isLvDefault || !isS1Default || !isS2Default || !areSkillsDefault || !isStampDefault) isModified = true;
        }
        img.classList.toggle('modified', isModified);
    });
}

/**
 * [메인 함수] 캐릭터 스탯 및 화면 정보를 통합 업데이트합니다.
 */
export function updateStats(level = parseInt(dom.sliderInput.value), skipBuffRender = false) {
    if (typeof charData === 'undefined') return;
    
    // 1. 헤더 업데이트
    updateStickyHeader(level);

    if (!state.currentId) {
        clearHeroTabRemnants();
        return; 
    }
    const data = charData[state.currentId];
    if (!data) return;

    // 2. Hero 탭 처리
    if (!data.base) {
        renderHeroTab(dom, updateStats);
        return; 
    }
    clearHeroTabRemnants();

    // 3. 스탯 계산 준비
    const brVal = parseInt(dom.extraSlider1.value) || 0;
    const fitVal = parseInt(dom.extraSlider2.value) || 0;
    const bonus1Rate = brVal * 0.02; 
    const bonus2Rate = fitVal * 0.04;

    const baseStats = {};
    for (const key in data.base) {
        let val = data.base[key] * Math.pow(constants.defaultGrowth, (level - 1));
        baseStats[key] = Math.floor(val * (1 + bonus1Rate) * (1 + bonus2Rate));
    }

    for (let i = 1; i <= 7; i++) {
        state.currentSkillLevels[i] = parseInt(document.getElementById(`skill-slider-${state.currentId}-${i}`)?.value || 1);
    }
    
    const isUltStamped = document.getElementById(`stamp-check-${state.currentId}`)?.checked || false;
    const liveContext = {
        liveLv: level, liveBr: brVal, liveFit: fitVal,
        liveTargetCount: state.savedStats[state.currentId]?.commonMultiTargetCount || 1,
        liveCustomValues: state.savedStats[state.currentId]?.customValues || {},
        liveStamp: isUltStamped
    };
    
    let subStats = calculateCharacterStats(state.currentId, data, state.currentSkillLevels, isUltStamped, getSkillMultiplier, JSON.parse(JSON.stringify(state.appliedBuffs)), charData, state.savedStats, liveContext);
    state.currentExtraDamages = subStats.extraDamages || [];

    // 4. 필살기 부스터 특수 처리
    if (state.selectedSkillIndex === 1) {
        applyBoosterToSubStats(subStats, data);
    }

    // 5. 최종 공격력/HP 확정
    const 기초공격력 = Math.floor(baseStats["공격력"] * (1 + (subStats["기초공증"] || 0) / 100));
    const 최종공격력 = 기초공격력 * (1 + (subStats["공증"] || 0) / 100) + (subStats["고정공증"] || 0);
    const 기초HP = baseStats["HP"] ? Math.floor(baseStats["HP"] * (1 + ((subStats["기초HP증가"] || 0) + (subStats["기초공증"] || 0)) / 100)) : 0;
    const 최종HP = 기초HP > 0 ? Math.floor(기초HP * (1 + (subStats["HP증가"] || 0) / 100)) : 0;
    
    // 6. UI 업데이트 실행
    updateMainStatDisplay(기초공격력, 최종공격력, 기초HP, 최종HP, baseStats);
    updateSubStatList(subStats);
    
    if (!skipBuffRender) {
        const disabledIds = getDisabledSkillIds(brVal, state.currentId);
        renderAppliedBuffsDisplay(state.appliedBuffs, charData, state.currentId, state.currentSkillLevels, getDynamicDesc, dom.appliedBuffsList, dom.currentlyAppliedBuffsDiv, updateStats, saveCurrentStats, disabledIds, state.savedStats, 기초공격력);
    }

    updateSkillCardsDisplay(data, subStats, 기초공격력, 최종공격력, 최종HP, isUltStamped);
    updateDetailViewDisplay(data, subStats, 기초공격력, 최종공격력, 최종HP, isUltStamped);
}

/**
 * 상단 고정 헤더 정보를 업데이트합니다.
 */
function updateStickyHeader(level) {
    const stickyHeader = document.getElementById('sticky-header');
    if (!stickyHeader) return;

    const infoSpans = ['sticky-name', 'sticky-attr', 'sticky-lv', 'sticky-br', 'sticky-fit'];
    const headerTitle = document.getElementById('sticky-header-title');
    
    // 특수 탭(null, hero, simulator)인 경우 캐릭터 정보 완전 차단
    if (!state.currentId || state.currentId === 'hero' || state.currentId === 'simulator') {
        if (headerTitle) {
            headerTitle.style.setProperty('display', 'flex', 'important');
            headerTitle.innerHTML = `<img src="icon/main.png" class="header-title-icon">동여성 공방`;
        }
        infoSpans.forEach(id => { 
            const el = document.getElementById(id); 
            if (el) {
                el.style.setProperty('display', 'none', 'important'); // 강제 숨김
                el.innerText = ''; // 텍스트 제거
            }
        });
    } else {
        // 실제 캐릭터인 경우
        const data = charData[state.currentId];
        if (data) {
            if (headerTitle) headerTitle.style.setProperty('display', 'none', 'important');
            
            infoSpans.forEach(id => { 
                const el = document.getElementById(id); 
                if (el) el.style.setProperty('display', 'flex', 'important'); // 강제 노출
            });
            
            const nameEl = document.getElementById('sticky-name');
            if (nameEl) nameEl.innerText = data.title;
            
            const attrName = constants.attributeList[data.info?.속성];
            const attrEl = document.getElementById('sticky-attr');
            if (attrEl) attrEl.innerHTML = `<img src="${constants.attributeImageMap[attrName]}" class="sticky-attr-icon">`;
            
            const brVal = parseInt(dom.extraSlider1.value) || 0;
            const brText = (brVal < 5) ? `0성 ${brVal}단` : (brVal < 15) ? `1성 ${brVal - 5}단` : (brVal < 30) ? `2성 ${brVal - 15}단` : (brVal < 50) ? `3성 ${brVal - 30}단` : (brVal < 75) ? `4성 ${brVal - 50}단` : "5성";
            
            if (document.getElementById('sticky-lv')) document.getElementById('sticky-lv').innerText = `Lv.${level}`;
            if (document.getElementById('sticky-br')) document.getElementById('sticky-br').innerText = brText;
            if (document.getElementById('sticky-fit')) document.getElementById('sticky-fit').innerText = `적합:${dom.extraSlider2.value}`;
        }
    }
}

/**
 * 공격력, HP 등 주요 스탯을 화면에 출력합니다.
 */
function updateMainStatDisplay(기초공격력, 최종공격력, 기초HP, 최종HP, baseStats) {
    dom.statsArea.innerHTML = '';
    const addStatLi = (label, val, tooltipText = null) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="stat-label">${label}</span> <span>${Math.floor(val).toLocaleString()}</span>`;
        if (tooltipText) {
            li.addEventListener('mouseenter', () => { if (!('ontouchstart' in window) && (navigator.maxTouchPoints <= 0)) { const tooltipControl = showSimpleTooltip(li, tooltipText); li.addEventListener('mouseleave', tooltipControl.onMouseLeave); } });
            li.addEventListener('click', (e) => {
                 e.stopPropagation();
                 const existing = document.querySelector('.buff-tooltip');
                 if (existing) { if (existing.timeoutId) clearTimeout(existing.timeoutId); existing.remove(); }
                 const tooltipControl = showSimpleTooltip(li, tooltipText);
                 const tooltipEl = document.querySelector('.buff-tooltip');
                 if (tooltipEl) { tooltipEl.timeoutId = setTimeout(() => { tooltipControl.remove(); }, 3000); }
                 const closeOnOutside = () => { tooltipControl.remove(); document.removeEventListener('click', closeOnOutside); };
                 setTimeout(() => document.addEventListener('click', closeOnOutside), 50);
            });
        }
        dom.statsArea.appendChild(li);
        return li;
    };

    // 기초공격력: 툴팁에 순수 베이스 공격력 표시
    addStatLi("기초공격력", 기초공격력, `초기공격력 : ${baseStats["공격력"].toLocaleString()}`);
    addStatLi("공격력", 최종공격력);
    
    if (최종HP > 0) {
        addStatLi("HP", 최종HP, `기초 HP : ${기초HP.toLocaleString()}`);
    }
}

/**
 * 부가 스탯 리스트를 렌더링합니다.
 */
function updateSubStatList(subStats) {
    const subWrapper = document.getElementById('sub-stats-wrapper');
    if (!subWrapper) return;
    subWrapper.innerHTML = ''; 

    const subStatToggleHeader = document.createElement('div');
    subStatToggleHeader.className = 'sub-stat-toggle-header';
    subStatToggleHeader.style.cssText = `width: 100px; margin: 15px auto 0; padding: 2px 5px; color: #888; cursor: pointer; font-weight: bold; font-size: 0.75em; display: flex; justify-content: center; align-items: center; gap: 4px;`;
    subStatToggleHeader.innerHTML = `<span>부가 스탯</span><span id="sub-stat-toggle-icon" style="font-size: 0.65em;">▼</span>`;
    subWrapper.appendChild(subStatToggleHeader);

    const subStatsContainer = document.createElement('div');
    subStatsContainer.style.cssText = `width: 100%; margin-bottom: 40px;`; 
    const subStatsList = document.createElement('ul');
    subStatsList.id = 'sub-stats-list';
    subStatsList.className = 'stat-list';
    subStatsList.style.marginTop = '5px';

    const isDesktop = window.innerWidth >= 1100;
    const isVisible = isDesktop || state.savedStats[state.currentId]?.subStatsListVisible === true;
    
    // PC 버전일 경우 토글 헤더 숨김, 모바일은 보임(flex)
    subStatToggleHeader.style.display = isDesktop ? 'none' : 'flex';
    
    // PC는 항상 보임, 모바일은 저장된 상태에 따라 보임
    subStatsContainer.style.display = isVisible ? 'block' : 'none';
    subStatToggleHeader.querySelector('span:last-child').textContent = isVisible ? '▲' : '▼';

    subStatToggleHeader.addEventListener('click', () => {
        if (window.innerWidth >= 1100) return; // PC에서는 클릭 무시
        const nowVisible = subStatsContainer.style.display === 'none';
        subStatsContainer.style.display = nowVisible ? 'block' : 'none';
        subStatToggleHeader.querySelector('span:last-child').textContent = nowVisible ? '▲' : '▼';
        state.savedStats[state.currentId].subStatsListVisible = nowVisible;
        saveCharacterStats(state.currentId, state.savedStats[state.currentId]);
    });

    const subStatDescriptions = { 
         "뎀증": "데미지 증가 수치입니다.",
         "평타뎀증": "고정수치가 아닌 보통공격의 범주에 해당하는 공격, 힐, 배리어를 강화합니다.",
         "필살기뎀증": "고정수치가 아닌 필살공격의 범주에 해당하는 공격, 힐, 배리어를 강화합니다.",
         "트리거뎀증": "고정수치가 아닌 추가계열 범주의 공격, 힐, 배리어를 강화합니다.",
         "뎀증디버프": "적이 보유한 받는 데미지 증가 디버프의 수치입니다.",
         "속성디버프": "적이 보유한 받는 속성데미지 증가 디버프의 수치입니다.",
         "공증": "공격력 증가 수치입니다.",
         "고정공증": "공격력에 가산되는 고정공격력 수치입니다.",
         "기초공증": "기초공격력 증가 수치입니다.",
         "HP증가": "최대HP 증가 수치입니다.",
         "기초HP증가": "기초 최대HP 증가 수치입니다.",
         "회복증가": "받는 모든 회복량을 증가시키는 수치입니다.",
         "배리어증가": "배리어 부여 스킬의 효과를 강화합니다.",
         "지속회복증가": "매 턴 발생하는 지속회복의 효과를 강화합니다." };

    const subStatDisplayNames = {
        "뎀증": "데미지 증가",
        "평타뎀증": "보통공격 효과",
        "필살기뎀증": "필살기 효과",
        "트리거뎀증": "발동 효과",
        "뎀증디버프": "데미지 디버프",
        "속성디버프": "속성 디버프",
        "공증": "공격력",
        "고정공증": "고정공격력",
        "기초공증": "기초공격력",
        "HP증가": "최대 HP",
        "기초HP증가": "기초 HP",
        "회복증가": "회복",
        "배리어증가": "배리어",
        "지속회복증가": "지속회복"
    };

    ["뎀증", "평타뎀증", "필살기뎀증", "트리거뎀증", "뎀증디버프", "속성디버프", "공증", "고정공증", "기초공증", "HP증가", "기초HP증가", "회복증가", "배리어증가", "지속회복증가"].forEach(cat => {
        const li = document.createElement('li');
        if (isDesktop) {
            li.style.cssText = `display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 8px 4px; gap: 4px; text-align: center;`;
        } else {
            li.style.cssText = `display: flex; flex-direction: row; align-items: center; justify-content: space-between; padding: 8px 10px;`;
        }
        let val = subStats[cat] || 0;
        if (cat === "고정공증") val = Math.floor(val); 
        const displayName = subStatDisplayNames[cat] || cat;
        
        if (isDesktop) {
            li.innerHTML = `<span class="stat-label" style="font-size: 0.75em; font-weight: normal; color: #aaa; margin: 0; line-height: 1.2;">${displayName}</span> <span style="font-size: 1.1em; font-weight: bold; color: #fff; line-height: 1;">${val}${cat !== "고정공증" ? '%' : ''}</span>`;
        } else {
            li.innerHTML = `<span class="stat-label" style="font-size: 0.82em; font-weight: normal; color: #aaa;">${displayName}</span> <span style="font-size: 1.1em; font-weight: bold; color: #fff;">${val}${cat !== "고정공증" ? '%' : ''}</span>`;
        }
        const tooltipText = subStatDescriptions[cat];
        if (tooltipText) {
            li.addEventListener('mouseenter', () => { if (!('ontouchstart' in window) && (navigator.maxTouchPoints <= 0)) { const tooltipControl = showSimpleTooltip(li, tooltipText); li.addEventListener('mouseleave', tooltipControl.onMouseLeave); } });
            li.addEventListener('click', (e) => { e.stopPropagation(); const existing = document.querySelector('.buff-tooltip'); if (existing) { if (existing.timeoutId) clearTimeout(existing.timeoutId); existing.remove(); } const tooltipControl = showSimpleTooltip(li, tooltipText); const tooltipEl = document.querySelector('.buff-tooltip'); if (tooltipEl) { tooltipEl.timeoutId = setTimeout(() => { tooltipControl.remove(); }, 3000); } const closeOnOutside = () => { tooltipControl.remove(); document.removeEventListener('click', closeOnOutside); }; setTimeout(() => document.addEventListener('click', closeOnOutside), 50); });
        }
        subStatsList.appendChild(li);
    });
    subStatsContainer.appendChild(subStatsList);
    subWrapper.appendChild(subStatsContainer);
}

/**
 * 스킬 카드들의 데미지 수치와 설명을 실시간으로 갱신합니다.
 */
function updateSkillCardsDisplay(data, subStats, 기초공격력, 최종공격력, 최종HP, isUltStamped) {
    dom.skillContainer.querySelectorAll('.skill-card').forEach(skillDiv => {
        const idx = parseInt(skillDiv.dataset.skillIndex);
        const skill = data.skills[idx];
        const lv = state.currentSkillLevels[idx + 1] || 1;
        
        // 설명문 갱신
        const embeddedDesc = skillDiv.querySelector('.embedded-skill-desc');
        if (embeddedDesc && (skillDiv.classList.contains('active') || skillDiv.classList.contains('always-open'))) {
            setFormattedDesc(embeddedDesc, getDynamicDesc(skill, lv, (idx === 1 && isUltStamped)));
        }

        // 데미지 수치 갱신
        const dmgTextDiv = skillDiv.querySelector('.skill-damage-text');
        if (!skill.damageDeal && !skill.healDeal && !skill.barrierDeal && !(skill.ratioEffects && skill.ratioEffects["고정공증"])) { 
            dmgTextDiv.innerText = ''; dmgTextDiv.style.display = 'none'; return; 
        }
        dmgTextDiv.style.display = 'block'; 
        const dmgInfo = getFormattedDamage(skill, lv, isUltStamped, true, undefined, undefined, subStats, 기초공격력, 최종공격력, 최종HP, idx);
        dmgTextDiv.innerText = dmgInfo.text;
        dmgTextDiv.style.fontSize = dmgInfo.text.length > 25 ? '0.72em' : '0.82em';
    });
}

/**
 * 중간 상세 정보창의 내용을 업데이트합니다.
 */
function updateDetailViewDisplay(data, subStats, 기초공격력, 최종공격력, 최종HP, isUltStamped) {
    if (!dom.newSectionArea || state.selectedSkillIndex === null) return;

    const idx = state.selectedSkillIndex;
    const isExternal = state.selectedIsExternal;
    const skill = isExternal ? state.currentExtraDamages[idx] : data.skills[idx];
    if (!skill) return;

    let lv = isExternal ? skill.level : (state.currentSkillLevels[idx + 1] || 1);
    if (!isExternal) {
        if (skill.syncLevelWith) {
            const targetIdx = data.skills.findIndex(s => s.id === skill.syncLevelWith);
            if (targetIdx !== -1) lv = state.currentSkillLevels[targetIdx + 1] || 1;
        } else if (skill.isUltExtra) { lv = state.currentSkillLevels[2] || 1; }
    }

    // [수정] 클래스명 변경 반영
    const detailHeaderRow = dom.newSectionArea.querySelector('.skill-detail-header-row');
    if (!detailHeaderRow) return;

    const bigIcon = detailHeaderRow.querySelector('.skill-detail-main-icon');
    if (bigIcon) bigIcon.src = skill.icon;

    const typeDiv = detailHeaderRow.querySelector('.skill-detail-type-label');
    if (typeDiv && skill.damageDeal) {
        const uniqueTypes = Array.from(new Set(skill.damageDeal.map(d => d.type)));
        typeDiv.textContent = (isExternal ? "[외부버프] " : "") + uniqueTypes.join(', ');
    }
    
    const nameEl = detailHeaderRow.querySelector('.skill-detail-title');
    if (nameEl) nameEl.innerHTML = `${skill.name} <span class="skill-detail-level-span">(Lv.${lv})</span>`;

    const detailDamageP = detailHeaderRow.querySelector('.skill-detail-damage-val');
    if (detailDamageP) {
        const attackerAttr = data.info?.속성;
        const targetAttr = constants.attributeList.indexOf(state.currentDisplayedAttribute);
        let displayText = "";

        if (isExternal) {
            let totalExtraDamage = 0;
            skill.damageDeal.forEach(d => { totalExtraDamage += calculateDamage(d.type, 최종공격력, subStats, d.val, false, attackerAttr, targetAttr); });
            displayText = Math.floor(totalExtraDamage).toLocaleString();
        } else {
            const dmgInfo = getFormattedDamage(skill, lv, isUltStamped, false, attackerAttr, targetAttr, subStats, 기초공격력, 최종공격력, 최종HP, idx);
            displayText = (skill.ratioEffects && skill.ratioEffects["고정공증"]) ? dmgInfo.text : dmgInfo.pureDmgText;
        }

        // 상성 색상 적용
        let damageColor = '#000'; 
        if (!isExternal && attackerAttr !== undefined && targetAttr !== -1) {
             const wins = { 0: 2, 1: 0, 2: 1, 3: 4, 4: 3 }, loses = { 0: 1, 1: 2, 2: 0, 3: 4, 4: 3 };
             if (wins[attackerAttr] === targetAttr) damageColor = '#28a745';
             else if (loses[attackerAttr] === targetAttr) {
                 if (attackerAttr <= 2 && targetAttr <= 2) damageColor = '#dc3545';
                 if ((attackerAttr === 3 && targetAttr === 4) || (attackerAttr === 4 && targetAttr === 3)) damageColor = '#28a745';
             }
        }
        detailDamageP.style.color = damageColor;
        detailDamageP.textContent = displayText;

        // 추가 아이콘 렌더링
        const iconContainer = detailHeaderRow.querySelector('.skill-detail-icon-column'); // 아이콘 컬럼 안에 추가하는 것으로 변경됨? 확인 필요
        // detail-view.js 구조: .skill-detail-icon-wrapper > .skill-detail-icon-column > img, button
        // 이전 로직: .skill-detail-icon-container 안에 추가했음. 
        // detail-view.js 리팩토링 후 구조:
        // <div class="skill-detail-icon-column">
        //    <img ... class="skill-detail-main-icon">
        //    <button ...>
        // </div>
        // 따라서 .skill-detail-icon-column을 타겟으로 잡아야 함.
        
        if (iconContainer) {
            iconContainer.querySelectorAll('.extra-dmg-icon').forEach(el => el.remove());
            const dmgInfo = getFormattedDamage(skill, lv, isUltStamped, false, attackerAttr, targetAttr, subStats, 기초공격력, 최종공격력, 최종HP, idx);
            if (dmgInfo.extraIcons) {
                dmgInfo.extraIcons.forEach(iconSrc => {
                    const img = document.createElement('img');
                    img.src = iconSrc;
                    img.className = 'extra-dmg-icon';
                    // 스타일은 CSS 클래스로 이동되었으므로 제거
                    iconContainer.appendChild(img);
                });
            }
        }
    }
}

/**
 * 필살기 부스터 스킬 효과를 subStats에 합산합니다.
 */
function applyBoosterToSubStats(subStats, charDataObj) {
    const boosterSkillIdx = charDataObj.skills.findIndex(s => s.isUltBooster);
    const currentBreakthrough = parseInt(dom.extraSlider1.value) || 0;
    const isUnlocked = (boosterSkillIdx === 6) ? (currentBreakthrough >= 75) : true; 
    if (boosterSkillIdx !== -1 && isUnlocked) {
        const boosterSkill = charDataObj.skills[boosterSkillIdx];
        const boosterLv = state.currentSkillLevels[boosterSkillIdx + 1] || 1;
        if (boosterSkill.calc && boosterSkill.calc.length > 0) {
            const maxVal = boosterSkill.calc[0].max;
            if (maxVal) {
                const rate = getSkillMultiplier(boosterLv, boosterSkill.startRate);
                subStats["뎀증"] = (subStats["뎀증"] || 0) + (maxVal * rate);
            }
        }
    }
}
