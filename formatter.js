// formatter.js

/**
 * 스킬 레벨에 따른 배율을 계산합니다.
 */
export function getSkillMultiplier(level, startVal = 0.6) {
    const safeLevel = Math.max(1, Math.min(level, 10));
    return startVal + (1 - startVal) * (safeLevel - 1) / 9;
}

/**
 * 스킬 데이터를 기반으로 동적 설명문을 생성합니다.
 */
export function getDynamicDesc(skill, level, isStamped, descriptionToFormat = null, targetAttrIdx = null) {
    if (!skill.calc || (!skill.desc && !descriptionToFormat)) return descriptionToFormat || skill.desc;

    const safeLevel = Math.max(1, Math.min(level, 10));
    let desc = descriptionToFormat || ((isStamped && skill.stampDesc) ? skill.stampDesc : skill.desc);

    // [추가] 속성 기반 수치 선택 로직 (설명문에 하나만 표시하기 위함)
    const isTargetAttr = (targetAttrIdx !== null && skill.buffEffects?.공증?.targetAttribute === targetAttrIdx);
    
    if (desc.includes('{2}')) {
        if (isTargetAttr) {
            // 속성 일치 시: {0}과 괄호 시작 부분만 지우고 {2}는 남김
            desc = desc.replace(/\{0\}%?\s*\(.*?(?=\{2\})/, ''); 
            desc = desc.replace(/\)\s*/, ' '); // 닫는 괄호를 지우고 공백 한 칸 삽입
        } else {
            // 속성 불일치 시: 괄호 부분 전체 제거
            desc = desc.replace(/\s*\(.*?\{2\}.*?\)/, '');
        }
    }

    skill.calc.forEach((formula, idx) => {
        let val = 0;
        // [수정] 개별 항목의 startRate 또는 stampStartRate를 우선 참조
        const currentStartRate = (isStamped && formula.stampStartRate !== undefined) 
                                 ? formula.stampStartRate 
                                 : (formula.startRate !== undefined ? formula.startRate : (skill.startRate !== undefined ? skill.startRate : 0.6));
        
        const rate = getSkillMultiplier(safeLevel, currentStartRate);

        if (formula.fixed !== undefined || (isStamped && formula.stampFixed !== undefined)) {
            val = (isStamped && formula.stampFixed !== undefined) ? formula.stampFixed : formula.fixed;
        } else if (formula.max !== undefined || (isStamped && formula.stampMax !== undefined)) {
            const baseMax = (isStamped && formula.stampMax !== undefined) ? formula.stampMax : (formula.max !== undefined ? formula.max : 0);
            val = baseMax * rate;
            if (typeof skill.decimalPlaces === 'number' && skill.decimalPlaces >= 0) {
                val = Number(val.toFixed(skill.decimalPlaces));
            }
        }
        
        // [추가] 결과값이 NaN인 경우 0으로 치환
        if (isNaN(val)) val = 0;
        
        desc = desc.replace(`{${idx}}`, val.toLocaleString());
    });

    return desc;
}
