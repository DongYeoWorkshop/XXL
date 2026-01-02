// buffs.js
import { getSkillMultiplier, getDynamicDesc } from './formatter.js';
import { charData } from './data.js'; // 추가
import { constants } from './state.js'; // 추가

/**
 * 버프 제공자의 최신 기초공격력을 계산하는 내부 헬퍼 함수
 */
function getBuffOwnerBaseAtk(buffCharId, ownerSaved, charData, currentId, currentSkillLevels, appliedBuffs) {
    const isOwnerCurrent = (buffCharId === currentId);
    const ownerLv = isOwnerCurrent ? parseInt(document.getElementById('level-slider').value) : parseInt(ownerSaved.lv || 1);
    const ownerBr = isOwnerCurrent ? parseInt(document.getElementById('extra1-slider').value) : parseInt(ownerSaved.s1 || 0);
    const ownerFit = isOwnerCurrent ? parseInt(document.getElementById('extra2-slider').value) : parseInt(ownerSaved.s2 || 0);
    const ownerData = charData[buffCharId];

    if (!ownerData || !ownerData.base) return 0;

    const pureBaseAtk = ownerData.base["공격력"] * Math.pow(constants.defaultGrowth, (ownerLv - 1));
    const bonus1Rate = ownerBr * 0.02;
    const bonus2Rate = ownerFit * 0.04;
    const ownerFitBaseAtk = Math.floor(pureBaseAtk * (1 + bonus1Rate) * (1 + bonus2Rate));

    let ownerSubBaseAtkRate = 0;
    // 패시브 효과 합산
    ownerData.skills.forEach((s, idx) => {
        if (s.buffEffects && s.buffEffects["기초공증"]) {
            const thresholds = [0, 0, 0, 0, 30, 50, 75];
            if (idx >= 4 && idx <= 6 && ownerBr < thresholds[idx]) return;
            
            let sLv = isOwnerCurrent ? (currentSkillLevels[idx + 1] || 1) : (ownerSaved.skills?.[`s${idx + 1}`] || 1);
            const sRate = getSkillMultiplier(sLv, s.startRate);
            const effectData = s.buffEffects["기초공증"];
            let valToAdd = 0;
            if (typeof effectData === 'object' && effectData !== null) {
                valToAdd = (effectData.max !== undefined ? effectData.max * sRate : effectData.fixed) || 0;
            } else {
                valToAdd = effectData || 0;
            }
            
            // [수정] 중첩(카운터) 수치 반영
            if (s.hasCounter) {
                const ownerAppliedBuffs = isOwnerCurrent ? appliedBuffs[buffCharId] : ownerSaved.appliedBuffs?.[buffCharId];
                const buff = ownerAppliedBuffs?.find(b => b.skillId === s.id);
                const count = buff ? (buff.count !== undefined ? buff.count : 0) : 0;
                valToAdd *= count;
            }
            
            if (typeof s.decimalPlaces === 'number') valToAdd = parseFloat(valToAdd.toFixed(s.decimalPlaces));
            ownerSubBaseAtkRate += valToAdd;
        }
    });

    return ownerFitBaseAtk * (1 + (ownerSubBaseAtkRate / 100));
}

export function addAppliedBuff(charId, skillId, isDefault, isAppliedStamped, appliedBuffs) {
    if (!appliedBuffs[charId]) appliedBuffs[charId] = [];
    if (!appliedBuffs[charId].some(b => b.skillId === skillId)) {
        appliedBuffs[charId].push({ skillId, isDefault, isAppliedStamped, isApplied: true, count: 1 });
    }
}

export function removeAppliedBuff(charId, skillId, appliedBuffs) {
    if (appliedBuffs[charId]) {
        appliedBuffs[charId] = appliedBuffs[charId].filter(b => b.skillId !== skillId);
        if (appliedBuffs[charId].length === 0) delete appliedBuffs[charId];
    }
}

/**
 * 버프 설명문에 실제 가산 수치를 주입하는 범용 함수
 */
export function formatBuffDescription(skill, buffCharId, currentId, savedStats, charData, currentSkillLevels, appliedBuffs, skillLevel, currentBaseAtk = 0, targetAttrIdx = null) {
    // [수정] 설명문에는 실제 캐릭터의 도장 상태를 반영하여 수치 표시
    const isOwnerUltStamped = (buffCharId === currentId) 
        ? (document.getElementById(`stamp-check-${currentId}`)?.checked || false)
        : (savedStats[buffCharId]?.stamp || false);

    let skillToFormat = JSON.parse(JSON.stringify(skill));
    
    // 커스텀 컨트롤 값 연동 로직...
    if (skillToFormat.customLink && savedStats[currentId]?.customValues) {
        const customVal = savedStats[currentId].customValues[skillToFormat.customLink.id] ?? (skillToFormat.customLink.initial || 0);
        if (skillToFormat.customLink.multiply && skillToFormat.calc) {
            skillToFormat.calc = skillToFormat.calc.map(c => {
                const newC = { ...c };
                if (newC.fixed !== undefined) newC.fixed *= customVal;
                if (newC.max !== undefined) newC.max *= customVal;
                return newC;
            });
        }
    }

    // [개선] formatter.js의 지능형 포맷팅 기능을 활용하여 속성별 수치 하나만 노출
    let listDesc = getDynamicDesc(skillToFormat, skillLevel, isOwnerUltStamped, skillToFormat.buffDesc, targetAttrIdx);
    let fullDesc = getDynamicDesc(skillToFormat, skillLevel, isOwnerUltStamped, skillToFormat.desc, targetAttrIdx);

    if (skillToFormat.ratioEffects && skillToFormat.ratioEffects["고정공증"] && skillToFormat.ratioEffects["고정공증"].from === "기초공격력") {
        const ratioData = skillToFormat.ratioEffects["고정공증"];
        const ownerBaseAtk = (buffCharId === currentId && currentBaseAtk > 0) 
            ? currentBaseAtk 
            : getBuffOwnerBaseAtk(buffCharId, savedStats?.[buffCharId] || {}, charData, currentId, currentSkillLevels, appliedBuffs);
            
        if (ownerBaseAtk > 0) {
            // [추가] 도장 여부에 따른 수치 결정
            const isOwnerUltStamped = (buffCharId === currentId) 
                ? (document.getElementById(`stamp-check-${currentId}`)?.checked || false)
                : (savedStats[buffCharId]?.stamp || false);
            
            const baseMax = (isOwnerUltStamped && ratioData.stampMax !== undefined) ? ratioData.stampMax : (ratioData.max || 0);
            const skillRate = getSkillMultiplier(skillLevel, skillToFormat.startRate);
            const addedAtk = Math.floor(ownerBaseAtk * (baseMax * skillRate / 100));
            const ratioText = `고정공격력 ${addedAtk.toLocaleString()} 증가`;
            
            // 비율 버프의 경우 목록 설명에 우선적으로 수치를 노출
            listDesc = ratioText;
            // 툴팁용 설명에도 수치 정보를 추가하거나 대체
            fullDesc = ratioText + (fullDesc ? `\n(${fullDesc})` : "");
        }
    }
    return { listDesc, fullDesc };
}
