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
    tooltip.innerHTML = `<div style="font-weight:bold; color:#fff; text-align:center;">${text}</div>`;
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
            separator.style.cssText = `display: flex; align-items: center; text-align: center; margin: 8px 0 5px; color: #999; font-size: 0.72em; font-weight: bold;`;
            separator.innerHTML = `<div style="flex-grow: 1; border-top: 1px dashed #444;"></div><span style="padding: 0 10px;">외부 버프</span><div style="flex-grow: 1; border-top: 1px dashed #444;"></div>`;
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
            if (skillIdx >= 4 && skillIdx <= 6) {
                const thresholds = [0, 0, 0, 0, 30, 50, 75]; 
                if (ownerBr < thresholds[skillIdx]) isDisabledByBreakthrough = true;
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
            textContainer.style.cssText = 'display:flex; align-items:center; flex-grow:1; overflow:hidden;'; // 넘침 방지 추가

            if (skill.icon) {
                const skillIcon = document.createElement('img');
                skillIcon.src = skill.icon;
                skillIcon.style.cssText = 'width:24px; height:24px; border-radius:4px; margin-right:8px; border:1px solid #000; cursor:default; background-color: black; flex-shrink:0;'; // 찌그러짐 방지
                
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
                <span class="buff-name-label" style="font-weight:bold; font-size:0.85em; margin-right:10px; white-space:nowrap; flex-shrink:0;">${skill.name} (Lv.${skillLevel})</span>
                <span style="font-size:${descFontSize}; color:#777; white-space:nowrap; letter-spacing:${descLetterSpacing}; overflow:visible;">${descriptionText}</span>
            `);

            buffItem.appendChild(textContainer);

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
                counterBtn.style.cssText = `width: 26px; height: 26px; min-width: 26px; flex-shrink: 0; border-radius: 50%; border: 1px solid #007bff; background: #fff; color: #007bff; font-weight: bold; cursor: ${isBtnDisabled ? 'not-allowed' : 'pointer'}; margin-left: auto; font-size: 0.85em; display: flex; align-items: center; justify-content: center; padding: 0; opacity: ${isBtnDisabled ? '0.4' : '1'};`;
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
                removeBtn.style.cssText = `margin-left: 10px; width: 20px; height: 20px; border-radius: 50%; border: 1px solid #dc3545; background: #fff; color: #dc3545; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; line-height: 1; padding: 0;`;
                removeBtn.onclick = (e) => {
                    e.stopPropagation();
                    removeAppliedBuff(buffCharId, skillId, appliedBuffs);
                    updateStatsCallback();
                    if (typeof saveCurrentStatsCallback === 'function') {
                        saveCurrentStatsCallback();
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
        item.style.padding = '8px 10px';
        item.style.cursor = 'pointer';
        item.style.borderBottom = '1px solid #f0f0f0';
        item.textContent = charData[charId].title;
        
        item.onmouseover = () => item.style.backgroundColor = '#f9f9f9';
        item.onmouseout = () => item.style.backgroundColor = '#fff';
        
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
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center'; // 수직 중앙 정렬 추가
    header.style.marginBottom = '10px';
    header.innerHTML = `
        <h4 style="margin: 0;">${char.title} 스킬</h4>
        <button onclick="this.parentElement.parentElement.style.display='none'" 
                style="padding: 2px 6px; font-size: 0.8em; cursor: pointer; border: 1px solid #ccc; background: #fff; border-radius: 4px; line-height: 1;">X</button>
    `;
    container.appendChild(header);

    char.skills.filter(s => !s.excludeFromBuffSearch).forEach(skill => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.alignItems = 'center';
        item.style.marginBottom = '5px';

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
        // [도장]일 때만 강조 색상 적용
        const isTrueStamp = (labelText === "[도장]");
        const labelColor = isTrueStamp ? "#007bff" : "#888";
        label.innerHTML = `<span style="color:${labelColor}; font-weight:${isTrueStamp ? 'bold' : 'normal'}; margin-right:5px;">${labelText}</span> ${skill.name}`;
        
        item.appendChild(checkbox);
        item.appendChild(label);
        container.appendChild(item);
    });
}
