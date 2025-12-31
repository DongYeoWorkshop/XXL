// render-skills.js
import { setFormattedDesc, getDynamicDesc } from './ui.js';
import { charData } from './data.js'; // 추가

/**
 * 캐릭터의 스킬 카드 목록을 화면에 렌더링합니다.
 */
export function renderSkills(charId, charData, savedStats, currentSkillLevels, container, updateStatsCallback, saveCurrentStatsCallback, sliderInputEl) {
    if (!container) return;
    container.innerHTML = '';
    const data = charData[charId];
    if (!data || !data.skills) return;

    const saved = savedStats[charId] || {};
    const activeSkills = saved.activeSkills || [];
    const isUltStamped = saved.stamp || false; // 도장 활성화 여부

    data.skills.forEach((skill, idx) => {
        // [수정] 8번째 스킬(인덱스 7) 이후는 무조건 카드 목록에서 제외
        if (idx >= 7) return;
        // 필살기 추가 데미지용 스킬(도장 패시브 등)도 여전히 제외
        if (skill.isUltExtra) return;

        const skillDiv = document.createElement('div');
        skillDiv.className = 'skill-card active'; // 항상 active 클래스 포함
        skillDiv.dataset.skillIndex = idx;

        // 모든 스킬을 데이터 상으로도 항상 활성 상태로 간주
        if (!saved.activeSkills) saved.activeSkills = [];
        if (!saved.activeSkills.includes(idx)) saved.activeSkills.push(idx);

        const skillLevel = currentSkillLevels[idx + 1] || 1;
        const skillKey = `s${idx + 1}`;
        const savedLv = saved.skills?.[skillKey] || 1;
        
        // 도장 활성화 상태면 클래스 추가 및 이미지 설정
        if (idx === 1 && isUltStamped) {
            skillDiv.classList.add('stamped-ult-card');
            skillDiv.style.backgroundImage = `url('images/sigil/sigil_${charId}.png')`;
        }

        skillDiv.innerHTML = `
            <div class="skill-header">
                <div class="skill-icon"><img src="${skill.icon}"></div>
                <div class="skill-info" style="display: flex; flex-direction: column; justify-content: center; min-height: 40px;">
                    <div style="display: flex; align-items: center; justify-content: space-between;">
                        <div style="font-weight: bold; font-size: 0.9em;">
                            ${skill.name} <span id="skill-val-${charId}-${idx + 1}" style="font-size: 0.85em; color: #ccc; font-weight: normal; margin-left: 4px;">Lv.${savedLv}</span>
                        </div>
                        ${idx === 1 ? `
                            <label class="toggle-switch" style="transform: scale(0.85); margin-right: -5px;">
                                <input type="checkbox" id="stamp-check-${charId}" ${isUltStamped ? 'checked' : ''}>
                                <span class="toggle-slider"></span>
                            </label>
                        ` : ''}
                    </div>
                    <div class="skill-damage-text" style="font-size: 0.82em; color: yellow; margin-top: 2px;"></div>
                </div>
            </div>
            <div class="skill-slider-container">
                <input type="range" id="skill-slider-${charId}-${idx + 1}" min="1" max="10" value="${savedLv}" class="skill-slider" data-skill-index="${idx}">
            </div>
            <div class="skill-embedded-description" style="display: block;"> <!-- 상세 설명 항상 노출 -->
                <p class="embedded-skill-desc" style="font-size:0.85em; color:#eee; margin-top:10px;"></p>
                <!-- [추가] 커스텀 입력 요소 (전의 스택 등) -->
                <div class="skill-custom-controls" style="margin-top: 10px;">
                    ${skill.customSlider ? `
                        <div style="display:flex; flex-direction:column; gap:5px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                            <div style="display:flex; justify-content:space-between; font-size:0.8em; color:#fff;">
                                <span>${skill.customSlider.label}</span>
                                <span class="custom-slider-val" style="font-weight:bold; color:yellow;">${saved.customValues?.[skill.customSlider.id] ?? skill.customSlider.initial ?? 0}</span>
                            </div>
                            <input type="range" 
                                   class="skill-custom-input" 
                                   data-key="${skill.customSlider.id}" 
                                   min="${skill.customSlider.min}" 
                                   max="${skill.customSlider.max}" 
                                   value="${saved.customValues?.[skill.customSlider.id] ?? skill.customSlider.initial ?? 0}"
                                   style="width:100%;">
                        </div>
                    ` : ''}
                    ${skill.customCounter ? `
                        <div style="display:flex; align-items:center; justify-content:space-between; padding: 8px 10px; background: rgba(0,0,0,0.3); border-radius: 6px;">
                            <span style="font-size:0.8em; color:#fff;">${skill.customCounter.label}</span>
                            <div style="display:flex; align-items:center; gap:10px;">
                                <button class="counter-btn minus" style="width:20px; height:20px; border-radius:50%; border:1px solid #666; background:#444; color:#fff; cursor:pointer;">-</button>
                                <span class="custom-counter-val" style="font-weight:bold; color:yellow; font-size:0.9em; min-width:15px; text-align:center;">${saved.customValues?.[skill.customCounter.id] ?? skill.customCounter.initial ?? 0}</span>
                                <button class="counter-btn plus" style="width:20px; height:20px; border-radius:50%; border:1px solid #666; background:#444; color:#fff; cursor:pointer;">+</button>
                                <input type="hidden" class="skill-custom-input" data-key="${skill.customCounter.id}" value="${saved.customValues?.[skill.customCounter.id] ?? skill.customCounter.initial ?? 0}">
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // 커스텀 입력 이벤트 처리
        const customInputs = skillDiv.querySelectorAll('.skill-custom-input');
        customInputs.forEach(input => {
            const labelVal = input.closest('.skill-card').querySelector(input.type === 'range' ? '.custom-slider-val' : '.custom-counter-val');
            
            if (input.type === 'range') {
                input.addEventListener('input', function(e) {
                    e.stopPropagation();
                    if (labelVal) labelVal.innerText = this.value;
                    if (!saved.customValues) saved.customValues = {};
                    saved.customValues[this.dataset.key] = parseInt(this.value);
                    updateStatsCallback();
                    saveCurrentStatsCallback();
                });
            } else {
                const row = input.closest('div');
                const plus = row.querySelector('.plus');
                const minus = row.querySelector('.minus');
                const updateCounter = (delta) => {
                    let val = parseInt(input.value) + delta;
                    val = Math.max(skill.customCounter.min, Math.min(skill.customCounter.max, val));
                    input.value = val;
                    if (labelVal) labelVal.innerText = val;
                    if (!saved.customValues) saved.customValues = {};
                    saved.customValues[input.dataset.key] = val;
                    updateStatsCallback();
                    saveCurrentStatsCallback();
                };
                plus.addEventListener('click', (e) => { e.stopPropagation(); updateCounter(1); });
                minus.addEventListener('click', (e) => { e.stopPropagation(); updateCounter(-1); });
            }
            input.addEventListener('click', (e) => e.stopPropagation());
        });

        // 도장 토글 이벤트 (필살기 전용)
        if (idx === 1) {
            const stampCheck = skillDiv.querySelector(`#stamp-check-${charId}`);
            stampCheck.addEventListener('change', function(e) {
                const checked = e.target.checked;
                if (!savedStats[charId]) savedStats[charId] = {};
                savedStats[charId].stamp = checked;
                
                if (checked) {
                    skillDiv.classList.add('stamped-ult-card');
                    skillDiv.style.backgroundImage = `url('images/sigil/sigil_${charId}.png')`;
                } else {
                    skillDiv.classList.remove('stamped-ult-card');
                    skillDiv.style.backgroundImage = 'none';
                }
                
                updateStatsCallback();
                saveCurrentStatsCallback();

                // [추가] 중간 섹션 아이콘 목록 즉시 갱신
                if (typeof window.triggerIconListUpdate === 'function') {
                    window.triggerIconListUpdate();
                }
            });
            stampCheck.addEventListener('click', (e) => e.stopPropagation());
        }

        // 슬라이더 이벤트
        const slider = skillDiv.querySelector('.skill-slider');
        const levelText = skillDiv.querySelector(`#skill-val-${charId}-${idx + 1}`);
        
        slider.addEventListener('input', function(e) {
            e.stopPropagation();
            const newVal = parseInt(this.value);
            if (levelText) levelText.innerText = `Lv.${newVal}`;
            currentSkillLevels[idx + 1] = newVal;

            // [추가] 슬라이더 조절 시 카드 자동 펼침
            if (!skillDiv.classList.contains('active')) {
                skillDiv.classList.add('active');
                const desc = skillDiv.querySelector('.skill-embedded-description');
                if (desc) desc.style.display = 'block';
                
                // 액티브 상태 저장
                if (!saved.activeSkills) saved.activeSkills = [];
                if (!saved.activeSkills.includes(idx)) saved.activeSkills.push(idx);
            }

            updateStatsCallback();
            saveCurrentStatsCallback();
        });
        slider.addEventListener('click', (e) => e.stopPropagation());

        // 카드 클릭 토글 로직 완전 제거

        container.appendChild(skillDiv);
    });

    // 모든 스킬 카드를 생성한 후, logic.updateStats를 호출하여 데미지와 상세 설명을 즉시 채웁니다.
    if (typeof updateStatsCallback === 'function') {
        updateStatsCallback();
    }
}

