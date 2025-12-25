// breakthrough.js
import { charData } from './data.js'; // 추가

// 돌파 단계별 해금 기준
export const BREAKTHROUGH_THRESHOLDS = {
  p1_level: 5,  // 1성 (Skill 3)
  p2_level: 15, // 2성 (Skill 4)
  p3_active: 30, // 3성 (Skill 5)
  p4_active: 50, // 4성 (Skill 6)
  p5_active: 75  // 5성 (Skill 7)
};

/**
 * 현재 돌파 단계에서 해금되지 않은 패시브 스킬 ID 목록을 반환합니다.
 * (패시브 1, 2는 레벨 제한만 있으므로 목록에서 제외하고, 3, 4, 5만 체크합니다.)
 */
export function getDisabledSkillIds(breakthroughValue, charId) {
    if (typeof charData === 'undefined') return [];
    const data = charData[charId];
    if (!data || !data.skills) return [];
    
    const disabledIds = [];
    // 패시브 3, 4, 5 (인덱스 4, 5, 6)만 체크하여 잠금 처리
    if (data.skills[4] && breakthroughValue < BREAKTHROUGH_THRESHOLDS.p3_active) disabledIds.push(data.skills[4].id);
    if (data.skills[5] && breakthroughValue < BREAKTHROUGH_THRESHOLDS.p4_active) disabledIds.push(data.skills[5].id);
    if (data.skills[6] && breakthroughValue < BREAKTHROUGH_THRESHOLDS.p5_active) disabledIds.push(data.skills[6].id);
    
    return disabledIds;
}

/**
 * 돌파 값에 따라 스킬 슬라이더의 활성화 상태와 레벨을 업데이트합니다.
 */
export function updateSkillStatesByBreakthrough(breakthroughValue, skillContainer, currentId, savedStats) {
    if (!skillContainer) return;

    // 패시브 스킬들에 대한 공통 처리 함수
    const updatePassive = (idx, threshold, isLockable) => {
        const card = skillContainer.querySelector(`[data-skill-index="${idx}"]`);
        if (!card) return;

        const slider = card.querySelector('input[type="range"]');
        const levelText = card.querySelector('.skill-level-text');
        const skillKey = `s${idx + 1}`;
        const isUnlocked = breakthroughValue >= threshold;

        if (!isUnlocked) {
            // 미해금 시: 레벨 1 고정 및 슬라이더 비활성화
            slider.value = 1;
            slider.disabled = true;
            if (levelText) levelText.innerText = 'Lv.1';
            
            // P3, P4, P5 (idx 4, 5, 6)는 카드 자체를 비활성화(흐리게)
            if (isLockable) {
                card.classList.add('disabled');
                // 설명창 닫기
                const desc = card.querySelector('.skill-embedded-description');
                if (desc) desc.style.display = 'none';
                card.classList.remove('active');
            }
        } else {
            // 해금 시: 슬라이더 활성화 및 저장된 레벨 복구
            slider.disabled = false;
            if (isLockable) {
                card.classList.remove('disabled');
                // [추가] 해금 시 자동으로 카드 펼치기
                card.classList.add('active');
                const desc = card.querySelector('.skill-embedded-description');
                if (desc) desc.style.display = 'block';
            }

            const savedVal = savedStats[currentId]?.skills?.[skillKey];
            if (savedVal !== undefined) {
                slider.value = savedVal;
                if (levelText) levelText.innerText = 'Lv.' + savedVal;
            }
        }
    };

    // Passive 1 (idx 2): 5단계 해금, 레벨 제한만 있음
    updatePassive(2, BREAKTHROUGH_THRESHOLDS.p1_level, false);
    
    // Passive 2 (idx 3): 15단계 해금, 레벨 제한만 있음
    updatePassive(3, BREAKTHROUGH_THRESHOLDS.p2_level, false);
    
    // Passive 3 (idx 4): 30단계 해금, 카드 잠금 포함
    updatePassive(4, BREAKTHROUGH_THRESHOLDS.p3_active, true);
    
    // Passive 4 (idx 5): 50단계 해금, 카드 잠금 포함
    updatePassive(5, BREAKTHROUGH_THRESHOLDS.p4_active, true);
    
    // Passive 5 (idx 6): 75단계 해금, 카드 잠금 포함
    updatePassive(6, BREAKTHROUGH_THRESHOLDS.p5_active, true);

    // --- 필살기 도장(Stamp) 해금 로직 (3성/30단 기준) ---
    const stampInput = document.getElementById(`stamp-check-${currentId}`);
    if (stampInput) {
        if (breakthroughValue < BREAKTHROUGH_THRESHOLDS.p3_active) {
            const wasChecked = stampInput.checked;
            
            // [추가] 실제 데이터도 강제로 끄기
            if (savedStats[currentId]) {
                savedStats[currentId].stamp = false;
            }

            stampInput.checked = false;
            stampInput.disabled = true;
            stampInput.parentElement.style.opacity = '0.5';
            stampInput.parentElement.style.cursor = 'not-allowed';
            
            const ultCard = skillContainer.querySelector('[data-skill-index="1"]');
            if (ultCard) {
                ultCard.style.backgroundImage = '';
                ultCard.classList.remove('stamped-ult-card');
                const embeddedDesc = ultCard.querySelector('.embedded-skill-desc');
                if (embeddedDesc && typeof window.getSkillDescByIdx === 'function') {
                    embeddedDesc.innerHTML = window.getSkillDescByIdx(1, false);
                }
            }
            
            // 상세창 및 아이콘 목록 즉시 갱신
            if (wasChecked) {
                if (typeof window.triggerDetailUpdate === 'function') window.triggerDetailUpdate(1);
                if (typeof window.triggerIconListUpdate === 'function') window.triggerIconListUpdate();
            }
        } else {
            stampInput.disabled = false;
            stampInput.parentElement.style.opacity = '1';
            stampInput.parentElement.style.cursor = 'pointer';
        }
    }
}