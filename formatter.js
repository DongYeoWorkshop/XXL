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
    const buffEff = skill.buffEffects;
    const isTargetAttr = (targetAttrIdx !== null && buffEff && 
                         ((buffEff.공증 && buffEff.공증.targetAttribute === targetAttrIdx) || 
                          (buffEff.HP증가 && buffEff.HP증가.targetAttribute === targetAttrIdx)));
    
    // 계산된 수치들을 먼저 준비
    const calculatedValues = skill.calc.map((formula) => {
        // [추가] 고정 레벨 수치 배열이 있으면 우선 사용
        if (formula.fixedLevels && Array.isArray(formula.fixedLevels)) {
            return formula.fixedLevels[safeLevel - 1] || 0;
        }

        const currentStartRate = (isStamped && formula.stampStartRate !== undefined) 
                                 ? formula.stampStartRate 
                                 : (formula.startRate !== undefined ? formula.startRate : (skill.startRate !== undefined ? skill.startRate : 0.6));
        const rate = getSkillMultiplier(safeLevel, currentStartRate);
        let val = 0;
        if (formula.fixed !== undefined || (isStamped && formula.stampFixed !== undefined)) {
            val = (isStamped && formula.stampFixed !== undefined) ? formula.stampFixed : formula.fixed;
        } else if (formula.max !== undefined || (isStamped && formula.stampMax !== undefined)) {
            const baseMax = (isStamped && formula.stampMax !== undefined) ? formula.stampMax : (formula.max !== undefined ? formula.max : 0);
            val = baseMax * rate;
            if (typeof skill.decimalPlaces === 'number' && skill.decimalPlaces >= 0) {
                val = Number(val.toFixed(skill.decimalPlaces));
            }
        }
        return isNaN(val) ? 0 : val;
    });

    // 속성 보너스 처리 로직
    if (isTargetAttr && calculatedValues[1] !== undefined) {
        // 공격 강화, 생명 강화 모두 1번 항목이 추가 보너스 수치이므로 합산
        calculatedValues[0] += calculatedValues[1];
    }

    // 설명문 치환
    if (desc.includes('{2}') && desc.includes('속성')) {
        // 속성 보너스 구문 제거 (이미 합산했으므로)
        // 예: "공격력 {0}% (불속성 시 {2}%) 증가" -> "공격력 {0}% 증가"
        // 괄호 안에 '속성'이라는 단어가 포함되어 있고 {2}가 있는 경우만 타겟팅
        desc = desc.replace(/\s*\([^)]*?속성[^)]*?\{2\}[^)]*?\)/, '');
    }

    calculatedValues.forEach((val, idx) => {
        const placeholder = `{${idx}}`;
        const styledValueOnly = `<span style="color: #f2a11f; font-weight: bold;">${val.toLocaleString()}</span>`;
        const styledValueWithPercent = `<span style="color: #f2a11f; font-weight: bold;">${val.toLocaleString()}%</span>`;

        // {idx}% 형태가 있으면 %까지 포함해서 치환, 아니면 {idx}만 치환
        if (desc.includes(`${placeholder}%`)) {
            desc = desc.split(`${placeholder}%`).join(styledValueWithPercent);
        } else {
            desc = desc.split(placeholder).join(styledValueOnly);
        }
    });

    return desc;
}
