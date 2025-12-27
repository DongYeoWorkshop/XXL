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
        skillDiv.className = 'skill-card';
        skillDiv.dataset.skillIndex = idx;

        // [수정] 모든 스킬 카드를 기본적으로 활성화(열림) 상태로 설정
        const isAlwaysOpen = (idx === 0 || idx === 1);
        if (isAlwaysOpen) skillDiv.classList.add('always-open');
        skillDiv.classList.add('active'); // 무조건 active 클래스 추가

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
            <div class="skill-embedded-description">
                <p class="embedded-skill-desc" style="font-size:0.85em; color:#eee; margin-top:10px;"></p>
            </div>
        `;

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

        // 카드 클릭 토글 (보통/필살기 제외)
        if (!isAlwaysOpen) {
            skillDiv.addEventListener('click', () => {
                const desc = skillDiv.querySelector('.skill-embedded-description');
                const isActive = skillDiv.classList.toggle('active');
                desc.style.display = isActive ? 'block' : 'none';
                
                // 액티브 스킬 인덱스 저장
                if (!saved.activeSkills) saved.activeSkills = [];
                if (isActive) {
                    if (!saved.activeSkills.includes(idx)) saved.activeSkills.push(idx);
                } else {
                    saved.activeSkills = saved.activeSkills.filter(i => i !== idx);
                }
                
                updateStatsCallback();
                saveCurrentStatsCallback();
            });
        }

        container.appendChild(skillDiv);
    });

    // 모든 스킬 카드를 생성한 후, logic.updateStats를 호출하여 데미지와 상세 설명을 즉시 채웁니다.
    if (typeof updateStatsCallback === 'function') {
        updateStatsCallback();
    }
}

