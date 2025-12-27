// ui.js
import { state } from './state.js';
import { charData } from './data.js'; // 추가
import { getSkillMultiplier, getDynamicDesc } from './formatter.js';
import { formatBuffDescription, addAppliedBuff, removeAppliedBuff } from './buffs.js';

export { getSkillMultiplier, getDynamicDesc, addAppliedBuff, removeAppliedBuff };

export function showToast(message) {
    let toast = document.querySelector('.toast-message');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast-message';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    
    // 기존 타이머가 있다면 취소하고 새로 설정 (연속 클릭 대응)
    if (toast.timeoutId) clearTimeout(toast.timeoutId);
    
    toast.timeoutId = setTimeout(() => { 
        toast.classList.remove('show'); 
    }, 2500);
}

export function showSimpleTooltip(target, text) {
    // 기존 툴팁 제거
    const existing = document.querySelector('.buff-tooltip');
    if (existing) existing.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'buff-tooltip';
    tooltip.innerHTML = `<div class="tooltip-content" style="font-weight:bold;">${text}</div>`;
    document.body.appendChild(tooltip);

    // 임시 렌더링 후 위치 계산을 위해 visible 설정 없이 append만 먼저 함
    // (CSS에서 기본적으로 opacity:0, visibility:hidden 상태임)

    const rect = target.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    
    // 툴팁 너비를 구하기 위해 잠시 렌더링된 상태값 참조
    // (offsetWidth가 0이면 텍스트 길이에 따라 대략적으로 계산하거나, 스타일을 강제 적용 후 계산)
    
    let leftPos = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
    
    // 화면 좌우 경계 침범 방지
    if (leftPos < 10) leftPos = 10;
    if (leftPos + tooltip.offsetWidth > screenWidth - 10) {
        leftPos = screenWidth - tooltip.offsetWidth - 10;
    }

    tooltip.style.left = `${leftPos}px`;
    tooltip.style.top = `${rect.bottom + window.scrollY + 8}px`; // 요소 바로 아래
    
    setTimeout(() => tooltip.classList.add('show'), 10);

    // PC(마우스오버)용: 마우스가 나가면 닫기
    const onMouseLeave = () => {
        removeTooltip();
        target.removeEventListener('mouseleave', onMouseLeave);
    };

    // 공통 닫기 함수
    const removeTooltip = () => {
        tooltip.classList.remove('show');
        setTimeout(() => { if (tooltip.parentNode) tooltip.remove(); }, 200);
    };

    return { remove: removeTooltip, onMouseLeave: onMouseLeave };
}

export function setFormattedDesc(element, text) {
    if (!element) return;
    const lines = text.split('\n');
    element.innerHTML = lines.map(line => line.trim().startsWith('*') ? `<span class="skill-footnote">${line}</span>` : line).join('<br>');
}

export function renderAppliedBuffsDisplay(appliedBuffs, charData, currentId, currentSkillLevels, getDynamicDescFn, container, parentArea, updateStatsCallback, saveCurrentStatsCallback, disabledSkillIds = [], savedStats = {}, currentBaseAtk = 0) {
    container.innerHTML = '';
    let hasBuffs = false;
    let externalBuffLabelAdded = false;

    for (const buffCharId in appliedBuffs) {
        const buffCharData = charData[buffCharId];
        if (!buffCharData) continue;

        if (buffCharId !== currentId && !externalBuffLabelAdded) {
            const separator = document.createElement('div');
            separator.className = 'buff-separator';
            separator.innerHTML = `<div class="buff-separator-line"></div><span style="padding: 0 10px;">외부 버프</span><div class="buff-separator-line"></div>`;
            container.appendChild(separator);
            externalBuffLabelAdded = true;
        }

        appliedBuffs[buffCharId].forEach(buff => {
            const skillId = buff.skillId;
            const skill = buffCharData.skills.find(s => s.id === skillId);
            if (!skill) return;

            hasBuffs = true;
            const skillIdx = buffCharData.skills.indexOf(skill);
            const isOwnerCurrent = (buffCharId === currentId);
            const ownerSaved = savedStats?.[buffCharId] || {};
            const ownerBr = isOwnerCurrent ? parseInt(document.getElementById('extra1-slider').value) : parseInt(ownerSaved.s1 || 0);
            
            let isDisabledByBreakthrough = false;
            // [수정] 테스트 더미는 돌파 제한 무시
            if (buffCharId !== 'test_dummy') {
                if (skillIdx >= 4 && skillIdx <= 6) {
                    const thresholds = [0, 0, 0, 0, 30, 50, 75]; 
                    if (ownerBr < thresholds[skillIdx]) isDisabledByBreakthrough = true;
                }
            }

            let skillLevel;
            // [수정] syncLevelWith가 있으면 대상 스킬의 레벨을 참조
            if (skill.syncLevelWith) {
                const targetSkill = buffCharData.skills.find(s => s.id === skill.syncLevelWith);
                const targetIdx = targetSkill ? buffCharData.skills.indexOf(targetSkill) : skillIdx;
                skillLevel = isOwnerCurrent 
                    ? (currentSkillLevels[targetIdx + 1] || 1)
                    : (savedStats[buffCharId]?.skills?.[`s${targetIdx + 1}`] || 1);
            } else {
                skillLevel = isOwnerCurrent 
                    ? (currentSkillLevels[skillIdx + 1] || 1)
                    : (savedStats[buffCharId]?.skills?.[`s${skillIdx + 1}`] || 1);
            }

            const buffItem = document.createElement('div');
            buffItem.className = 'applied-buff-item';
            
            // [수정] 조작 가능 여부 통합 체크 (돌파, 도장, 의존성)
            let isControllable = !isDisabledByBreakthrough;

            // 1. 도장 체크 (도장이 '반드시' 필요한 스킬인 경우에만 제한)
            // isUltExtra(도장 패시브)나 stampBuffEffects(도장 전용 버프)가 있는 경우에만 도장 여부에 따라 잠금
            const strictlyRequiresStamp = !!(skill.isUltExtra || skill.stampBuffEffects);
            if (isControllable && strictlyRequiresStamp) {
                const isOwnerUltStamped = (buffCharId === currentId) 
                    ? (document.getElementById(`stamp-check-${currentId}`)?.checked || false)
                    : (savedStats[buffCharId]?.stamp || false);
                if (!isOwnerUltStamped) isControllable = false;
            }

            // 2. 토글 의존성 체크
            if (isControllable && skill.toggleDependency) {
                const dependencyBuff = appliedBuffs[buffCharId].find(b => b.skillId === skill.toggleDependency);
                if (dependencyBuff) {
                    const dependencySkill = buffCharData.skills.find(s => s.id === skill.toggleDependency);
                    const depToggleType = dependencySkill?.toggleType || 'isAppliedStamped';
                    if (!dependencyBuff[depToggleType]) {
                        isControllable = false;
                        // [추가] 의존성이 꺼지면 나도 끈다 (데이터 동기화)
                        const myToggleType = skill.toggleType || 'isAppliedStamped';
                        if (buff[myToggleType]) {
                            buff[myToggleType] = false;
                            // 무한 루프 방지를 위해 비동기로 저장 및 업데이트 호출
                            setTimeout(() => {
                                if (typeof updateStatsCallback === 'function') updateStatsCallback();
                                if (typeof saveCurrentStatsCallback === 'function') saveCurrentStatsCallback();
                            }, 0);
                        }
                    }
                } else {
                    isControllable = false;
                }
            }

            if (!isControllable) buffItem.classList.add('buff-off-state');

            if (skill.customLink && savedStats[currentId]?.customValues) {
                const customVal = savedStats[currentId].customValues[skill.customLink.id] ?? (skill.customLink.initial || 0);
                if (skill.customLink.multiply) {
                    if (customVal === 0) buffItem.classList.add('buff-off-state');
                } else if (skill.customLink.condition === 'eq') {
                    if (customVal !== skill.customLink.value) buffItem.classList.add('buff-off-state');
                }
            }

            const descs = formatBuffDescription(skill, buffCharId, currentId, savedStats, charData, currentSkillLevels, appliedBuffs, skillLevel, currentBaseAtk);
            const descriptionText = descs.listDesc;
            let fullDescriptionText = descs.fullDesc;

            // [추가] 8~9번 스킬 혹은 연동된 스킬의 경우 툴팁에 원본 스킬의 설명(도장 포함) 표시
            let tooltipSkill = skill;
            if (skill.syncLevelWith) {
                const linkedSkill = buffCharData.skills.find(s => s.id === skill.syncLevelWith);
                if (linkedSkill) {
                    tooltipSkill = linkedSkill;
                    const isStamp = !!(skill.isUltExtra || skill.hasStampEffect || skill.stampBuffEffects);
                    fullDescriptionText = getDynamicDescFn(linkedSkill, skillLevel, isStamp);
                }
            }

            const textContainer = document.createElement('div');
            textContainer.className = 'buff-text-container';

            if (skill.icon) {
                const skillIcon = document.createElement('img');
                skillIcon.src = skill.icon;
                skillIcon.className = 'buff-icon';
                
                // PC용: 마우스 오버 시 툴팁 표시
                skillIcon.addEventListener('mouseenter', (e) => {
                    if (!('ontouchstart' in window) && (navigator.maxTouchPoints <= 0)) {
                        const removeTooltip = showTooltip(e.target, buffCharData.title, tooltipSkill, skillLevel, fullDescriptionText);
                        skillIcon.addEventListener('mouseleave', removeTooltip, { once: true });
                    }
                });

                // 공용: 클릭 시 툴팁 표시
                skillIcon.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showTooltip(e.target, buffCharData.title, tooltipSkill, skillLevel, fullDescriptionText);
                });
                textContainer.appendChild(skillIcon);
            }

            // 시각적 너비 가중치 계산 (한글 1, 영문/숫자 0.52)
            const visualLength = [...descriptionText].reduce((acc, char) => {
                return acc + (char.charCodeAt(0) > 255 ? 1 : 0.52);
            }, 0);

            const isMobile = window.innerWidth <= 600;
            // 가중치 기준치 설정
            const threshold1 = isMobile ? 12 : 24;
            const threshold2 = isMobile ? 20 : 35;

            // 모바일은 px 단위로 강제 고정하여 브라우저의 최소 크기 제약을 우회 시도
            let descFontSize = isMobile ? '12px' : '0.85em';
            let descLetterSpacing = 'normal';
            
            if (visualLength > threshold2) {
                descFontSize = isMobile ? '10px' : '0.7em';
                descLetterSpacing = '-0.05em';
            } else if (visualLength > threshold1) {
                descFontSize = isMobile ? '11px' : '0.78em';
                descLetterSpacing = '-0.02em';
            }

            textContainer.insertAdjacentHTML('beforeend', `
                <span class="buff-name-label">${skill.name} (Lv.${skillLevel})</span>
                <span class="buff-desc" style="font-size:${descFontSize}; letter-spacing:${descLetterSpacing};">${descriptionText}</span>
            `);

            buffItem.appendChild(textContainer);

            // [추가] 커스텀 입력(테스트 더미) 처리
            if (skill.isCustomInput) {
                const input = document.createElement('input');
                input.type = 'number';
                input.value = buff.customValue || 0;
                input.className = 'buff-custom-input';
                
                // onchange로 값 업데이트 (참조 안정성 강화)
                input.onchange = (e) => {
                    const val = parseFloat(e.target.value) || 0;
                    
                    // appliedBuffs 배열에서 현재 버프 객체를 다시 찾아 업데이트
                    // (렌더링 과정에서 참조가 달라질 수 있으므로 안전하게 검색)
                    const currentBuffList = appliedBuffs[buffCharId];
                    if (currentBuffList) {
                        const targetBuff = currentBuffList.find(b => b.skillId === skillId);
                        if (targetBuff) {
                            targetBuff.customValue = val;
                        }
                    }
                    
                    updateStatsCallback();
                    saveCurrentStatsCallback();
                };
                
                // 클릭 이벤트 전파 방지 (버프 아이템 클릭 방지)
                input.onclick = (e) => e.stopPropagation();
                
                buffItem.appendChild(input);
                
                // [수정] 고정공격력(custom_stat_8)인 경우 % 단위를 생략
                if (skill.id !== 'custom_stat_8') {
                    const unitSpan = document.createElement('span');
                    unitSpan.textContent = '%';
                    unitSpan.className = 'buff-unit-span';
                    buffItem.appendChild(unitSpan);
                } else {
                    // 고정공격력은 단위 없이 여백만 추가
                    const marginSpan = document.createElement('span');
                    marginSpan.style.marginRight = '5px';
                    buffItem.appendChild(marginSpan);
                }
            }

            if (skill.hasToggle) {
                const toggleType = skill.toggleType || 'isAppliedStamped';
                
                const toggle = createToggle(buff[toggleType], !isControllable, (checked) => {
                    if (buffCharId === 'beernox' && checked) {
                        const partnerId = (skillId === 'beernox_skill1' ? 'beernox_skill2' : skillId === 'beernox_skill2' ? 'beernox_skill1' : null);
                        if (partnerId) {
                            const pBuff = appliedBuffs['beernox'].find(b => b.skillId === partnerId);
                            if (pBuff) pBuff[toggleType] = false;
                        }
                    }
                    buff[toggleType] = checked;
                    updateStatsCallback();
                    saveCurrentStatsCallback();
                });
                buffItem.appendChild(toggle);
                if (!buff[toggleType] || !isControllable) buffItem.classList.add('buff-off-state');
            } else if (skill.hasCounter) {
                const countVal = buff.count !== undefined ? buff.count : 0;
                const min = skill.counterRange?.min || 0;
                const max = skill.counterRange?.max || 10;
                const counterBtn = document.createElement('button');
                // [수정] isControllable을 사용하여 실제 비활성화 및 시각적 처리
                const isBtnDisabled = !isControllable;
                counterBtn.className = 'btn-circle-small';
                if (isBtnDisabled) {
                    counterBtn.style.opacity = '0.4'; // 동적 상태라 인라인 유지 또는 클래스 분리 가능
                    counterBtn.style.cursor = 'not-allowed';
                }
                counterBtn.textContent = countVal;
                counterBtn.disabled = isBtnDisabled;
                counterBtn.onclick = () => {
                    if (isBtnDisabled) return;
                    let nextVal = buff.count + 1;
                    if (nextVal > max) nextVal = min;
                    buff.count = nextVal;
                    counterBtn.textContent = nextVal;
                    updateStatsCallback();
                    saveCurrentStatsCallback();
                };
                buffItem.appendChild(counterBtn);
            }

            // [추가] 외부 버프인 경우 삭제(X) 버튼 추가
            if (buffCharId !== currentId) {
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '×';
                removeBtn.title = '버프 제거';
                removeBtn.className = 'btn-remove-small';
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    removeAppliedBuff(buffCharId, skillId, appliedBuffs);
                    
                    // [수정] UI 즉시 갱신 로직 강화
                    updateStatsCallback();
                    if (typeof saveCurrentStatsCallback === 'function') {
                        saveCurrentStatsCallback();
                    }
                    
                    // 현재 하단 스킬 리스트에 표시 중인 캐릭터가 삭제된 버프의 주인이라면 리스트도 갱신
                    const selectionArea = document.getElementById('buff-skill-selection-area');
                    if (selectionArea && selectionArea.style.display !== 'none') {
                        const headerH4 = selectionArea.querySelector('h4');
                        if (headerH4 && headerH4.textContent.includes(buffCharData.title)) {
                            // 스킬 리스트 다시 그리기
                            displayBuffSkills(buffCharId, charData, selectionArea, appliedBuffs, addAppliedBuff, removeAppliedBuff, renderAppliedBuffsDisplay, updateStatsCallback, null, currentSkillLevels, getDynamicDescFn, savedStats, saveCurrentStatsCallback);
                        }
                    }

                    // [추가] 아이콘 목록 갱신
                    if (typeof window.triggerIconListUpdate === 'function') {
                        window.triggerIconListUpdate();
                    }
                };
                buffItem.appendChild(removeBtn);
            }

            container.appendChild(buffItem);
        });
    }
    parentArea.style.display = hasBuffs ? 'block' : 'none';
}

function showTooltip(target, charTitle, skill, level, desc = "") {
    const existing = document.querySelector('.buff-tooltip');
    if (existing) existing.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'buff-tooltip';
    
    // [수정] 스킬 이름 (Lv.X) 및 상세 설명 표시
    tooltip.innerHTML = `
        <div style="font-weight:bold; color:#ffcb05; text-align:center; white-space: nowrap; border-bottom: 1px solid rgba(255,255,255,0.2); margin-bottom: 5px; padding-bottom: 3px;">
            ${skill.name} (Lv.${level})
        </div>
        <div style="font-size: 0.85em; color: #eee; text-align: center; line-height: 1.4;">
            ${desc}
        </div>
    `;
    document.body.appendChild(tooltip);

    const rect = target.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    
    // 툴팁 위치 계산 (아이콘 중앙 위쪽)
    let leftPos = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2);
    
    // 화면 좌우 경계 침범 방지 (최소 10px 간격 유지)
    if (leftPos < 10) leftPos = 10;
    if (leftPos + tooltip.offsetWidth > screenWidth - 10) {
        leftPos = screenWidth - tooltip.offsetWidth - 10;
    }

    tooltip.style.left = `${leftPos}px`;
    tooltip.style.top = `${rect.top + window.scrollY - tooltip.offsetHeight - 12}px`;
    
    // 애니메이션 효과와 함께 표시
    setTimeout(() => tooltip.classList.add('show'), 10);

    const removeTooltip = () => {
        tooltip.classList.remove('show');
        setTimeout(() => { if (tooltip.parentNode) tooltip.remove(); }, 200);
        document.removeEventListener('click', removeTooltip);
    };
    
    // 클릭으로 닫기 (모바일 대응)
    setTimeout(() => document.addEventListener('click', removeTooltip), 50);
    // target에서 마우스가 나가면 닫기 (PC 대응용 헬퍼)
    return removeTooltip;
}

function createToggle(checked, disabled, onChange) {
    const label = document.createElement('label');
    label.className = 'toggle-switch';
    label.style.marginLeft = 'auto';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = checked;
    input.disabled = disabled;
    input.addEventListener('change', (e) => onChange(e.target.checked));
    const span = document.createElement('span');
    span.className = 'toggle-slider';
    label.appendChild(input);
    label.appendChild(span);
    return label;
}

export function renderBuffSearchResults(matchingChars, charData, buffSearchResultsEl, buffCharSearchEl, buffSkillSelectionAreaEl, displayBuffSkillsCallback, appliedBuffs, addAppliedBuffFn, removeAppliedBuffFn, renderAppliedBuffsDisplayFn, updateStatsCallback, sliderInputEl, currentSkillLevels, getDynamicDescFn, savedStats, saveCurrentStatsCallback) {
    buffSearchResultsEl.innerHTML = '';
    if (matchingChars.length === 0) {
        buffSearchResultsEl.innerHTML = '<div style="padding:10px; color:#888;">일치하는 캐릭터 없음</div>';
        return;
    }

    matchingChars.forEach(charId => {
        const item = document.createElement('div');
        item.className = 'buff-search-item';
        item.textContent = charData[charId].title;
        
        item.onclick = () => {
            buffCharSearchEl.value = charData[charId].title;
            buffSearchResultsEl.style.display = 'none';
            // [수정] saveCurrentStatsCallback 추가 전달
            displayBuffSkills(charId, charData, buffSkillSelectionAreaEl, appliedBuffs, addAppliedBuffFn, removeAppliedBuffFn, renderAppliedBuffsDisplayFn, updateStatsCallback, sliderInputEl, currentSkillLevels, getDynamicDescFn, savedStats, saveCurrentStatsCallback);
        };
        buffSearchResultsEl.appendChild(item);
    });
    buffSearchResultsEl.style.display = 'block';
}

export function displayBuffSkills(charId, charData, container, appliedBuffs, addAppliedBuffFn, removeAppliedBuffFn, renderAppliedBuffsDisplayFn, updateStatsCallback, sliderInputEl, currentSkillLevels, getDynamicDescFn, savedStats = {}, saveCurrentStatsCallback) {
    container.innerHTML = '';
    container.style.display = 'block';
    const char = charData[charId];
    
    const header = document.createElement('div');
    header.className = 'buff-select-header';
    header.innerHTML = `
        <h4 style="margin: 0;">${char.title} 스킬</h4>
        <button onclick="this.parentElement.parentElement.style.display='none'" 
                class="btn-close-x">X</button>
    `;
    container.appendChild(header);

    char.skills.filter(s => !s.excludeFromBuffSearch).forEach(skill => {
        const item = document.createElement('div');
        item.className = 'buff-select-item';

        const isApplied = appliedBuffs[charId]?.some(b => b.skillId === skill.id);
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = isApplied;
        checkbox.onchange = (e) => {
            if (e.target.checked) addAppliedBuffFn(charId, skill.id, false, false, appliedBuffs);
            else removeAppliedBuffFn(charId, skill.id, appliedBuffs);
            
            // [수정] 스탯 업데이트 및 상태 저장 호출
            updateStatsCallback();
            if (typeof saveCurrentStatsCallback === 'function') {
                saveCurrentStatsCallback();
            }
            // [추가] 아이콘 목록 즉시 갱신
            if (typeof window.triggerIconListUpdate === 'function') {
                window.triggerIconListUpdate();
            }
        };

        const idx = char.skills.indexOf(skill);
        // [수정] 도장 감지 로직에 isUltExtra 추가
        const isStamp = !!(skill.stampDesc || skill.hasStampEffect || skill.stampBuffEffects || skill.isUltExtra);
        let labelText = "";

        // 라벨 결정 함수 (재사용을 위해 분리)
        const getLabelByIdx = (targetIdx) => {
            if (targetIdx === 0) return "보통공격";
            if (targetIdx === 1) return "필살기";
            if (targetIdx >= 2 && targetIdx <= 6) return `패시브${targetIdx - 1}`;
            return `패시브${targetIdx - 1}`;
        };

        if (idx === 0) {
            labelText = "보통공격";
        } else if (idx === 1) {
            labelText = "필살기";
        } else if (idx >= 2 && idx <= 6) {
            labelText = `패시브${idx - 1}`;
        } else if (idx >= 7) {
            if (isStamp) {
                labelText = "[도장]";
            } else if (skill.syncLevelWith) {
                // 연결된 스킬의 인덱스를 찾아 해당 라벨을 가져옴
                const targetSkillIdx = char.skills.findIndex(s => s.id === skill.syncLevelWith);
                if (targetSkillIdx !== -1) {
                    labelText = getLabelByIdx(targetSkillIdx);
                } else {
                    labelText = `패시브${idx - 1}`;
                }
            } else {
                labelText = `패시브${idx - 1}`;
            }
        }
        
        const label = document.createElement('label');
        label.className = 'buff-select-label';
        // [도장]일 때만 강조 색상 적용
        const isTrueStamp = (labelText === "[도장]");
        const labelClass = isTrueStamp ? "buff-select-label-stamp" : "buff-select-label-normal";
        label.innerHTML = `<span class="${labelClass}">${labelText}</span> ${skill.name}`;
        
        item.appendChild(checkbox);
        item.appendChild(label);
        container.appendChild(item);
    });
}
