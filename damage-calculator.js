// damage-calculator.js
import { calculateDamage } from './calculations.js?v=20251225';
import { getSkillMultiplier } from './formatter.js';
import { state } from './state.js';
import { charData } from './data.js';

// 데미지 계산 및 텍스트 포맷팅 공통 헬퍼
export function getFormattedDamage(skill, lv, isUltStamped, isForCard = false, attackerAttr, targetAttr, calculatedSubStats, 기초공격력, 최종공격력, 최종HP, idx) {
    let result = { total: 0, text: '', extraIcons: [] };
    if (!skill) return result;

    // [복구] 데미지/힐/배리어 여부 체크
    const hasDamage = skill.damageDeal && skill.damageDeal.length > 0;
    const hasHeal = skill.healDeal && skill.healDeal.length > 0;
    const hasBarrier = skill.barrierDeal && skill.barrierDeal.length > 0;

    // 1. 공격 스킬 및 기타 수치 계산 시작
    let currentCalcSubStats = { ...calculatedSubStats }; 

    // [추가] 고정공증 가산 수치 미리 계산 (나중에 텍스트에 합치기 위함)
    let additionText = '';
    if (skill.ratioEffects && skill.ratioEffects["고정공증"]) {
        const ratioData = skill.ratioEffects["고정공증"];
        if (ratioData.from === "기초공격력") {
            const isStamped = isUltStamped && ratioData.stampMax !== undefined;
            const baseMax = isStamped ? ratioData.stampMax : (ratioData.max || 0);
            const rate = getSkillMultiplier(lv, skill.startRate);
            const ratioPercent = baseMax * rate;
            const val = 기초공격력 * (ratioPercent / 100);
            additionText = `가산: +${Math.floor(val).toLocaleString()}`;
        }
    }

    // 데미지/힐/배리어 모두 없는 경우 (순수 버프 스킬 등) 조기 반환
    if (!hasDamage && !hasHeal && !hasBarrier) {
        if (additionText) {
            return { total: 0, text: additionText, isBuff: true, extraIcons: [] };
        }
        return result; 
    }

    // 필살기 부스터 자동 적용 (필살기 계산 시에만)
    if (idx === 1) {
        const charDataObj = charData[state.currentId];
        if (charDataObj) {
            const boosterSkillIdx = charDataObj.skills.findIndex(s => s.isUltBooster);
            const currentBreakthrough = state.savedStats[state.currentId]?.s1 || 0;
            const isUnlocked = (boosterSkillIdx === 6) ? (currentBreakthrough >= 75) : true; 

            if (boosterSkillIdx !== -1 && isUnlocked) {
                const boosterSkill = charDataObj.skills[boosterSkillIdx];
                const boosterLv = (state.currentSkillLevels && state.currentSkillLevels[boosterSkillIdx + 1]) || 1;
                if (boosterSkill.calc && boosterSkill.calc.length > 0) {
                    const maxVal = boosterSkill.calc[0].max;
                    if (maxVal) {
                        const rate = getSkillMultiplier(boosterLv, boosterSkill.startRate);
                        const boostVal = maxVal * rate;
                        currentCalcSubStats["뎀증"] = (currentCalcSubStats["뎀증"] || 0) + boostVal;
                    }
                }
            }
        }
    }

    let totalDmg = 0;
    const isStampedSkill = (idx === 1 || skill.hasStampEffect === true); 
    
    // 카운터에 따른 특수 데미지 매핑 처리
    let damageEntriesToCalc = skill.damageDeal || [];
    if (skill.damageDeal && skill.counterDamageMap) {
        let currentCounter;
        if (isForCard) {
            currentCounter = 1; 
        } else {
            currentCounter = state.savedStats[state.currentId]?.commonMultiTargetCount || 1;
        }
        
        const entryIdx = skill.counterDamageMap[String(currentCounter)];
        if (entryIdx !== undefined) {
            damageEntriesToCalc = [skill.damageDeal[entryIdx]];
        } else {
            damageEntriesToCalc = []; 
        }
    }

    // 텍스트 구성을 위한 배열
    let textParts = [];

    damageEntriesToCalc.forEach(entry => {
        const isStamped = isStampedSkill && isUltStamped;
        const baseMax = (isStamped && entry.val.stampMax !== undefined) ? entry.val.stampMax : entry.val.max;
        
        const currentStartRate = (isStamped && entry.val.stampStartRate !== undefined) 
                                 ? entry.val.stampStartRate 
                                 : (entry.val.startRate !== undefined ? entry.val.startRate : skill.startRate);
        
        const coeff = (typeof entry.val === 'object') ? (baseMax * getSkillMultiplier(lv, currentStartRate)) : entry.val;
        
        let currentIsMultiTarget = skill.isMultiTarget;
        if (entry.isMultiTarget !== undefined) currentIsMultiTarget = entry.isMultiTarget;
        if (isStamped && entry.stampIsMultiTarget !== undefined) currentIsMultiTarget = entry.stampIsMultiTarget;

        let currentDmg = calculateDamage(entry.type, entry.type === "기초공격" ? 기초공격력 : 최종공격력, currentCalcSubStats, coeff, isStamped, isForCard ? undefined : attackerAttr, isForCard ? undefined : targetAttr);
        
        currentDmg = Math.floor(currentDmg);

        let currentIsSingleTarget = entry.isSingleTarget;
        if (isStamped && entry.stampIsMultiTarget) currentIsSingleTarget = false;

        if (currentIsMultiTarget && !currentIsSingleTarget) { 
            let targetCount = isForCard ? 1 : (state.savedStats[state.currentId]?.commonMultiTargetCount || 1);
            if (skill.counterDamageMap) {
                if (isForCard) targetCount = 1;
                else {
                    const globalCount = state.savedStats[state.currentId]?.commonMultiTargetCount || 1;
                    targetCount = (skill.counterDamageMap[String(globalCount)] !== undefined) ? globalCount : 0;
                }
            }
            currentDmg *= targetCount;
        }
        totalDmg += (currentDmg || 0);
        
        if (currentDmg > 0) {
            if (isForCard) {
                const label = entry.type || "데미지";
                textParts.push(`${label}: ${currentDmg.toLocaleString()}`);
            } else {
                textParts.push(`${currentDmg.toLocaleString()}`);
            }
        }
    });

    if (textParts.length > 0) {
        result.text = textParts.join(' / ');
    }

    // 힐(회복) 계산 로직
    if (skill.healDeal) {
        const sub_회복증가 = (calculatedSubStats["회복증가"] || 0) / 100; 
        const sub_평타뎀증 = (calculatedSubStats["평타뎀증"] || 0) / 100;
        const sub_필살기뎀증 = (calculatedSubStats["필살기뎀증"] || 0) / 100;
        const sub_트리거뎀증 = (calculatedSubStats["트리거뎀증"] || 0) / 100;
        const sub_지속회복증가 = (calculatedSubStats["지속회복증가"] || 0) / 100;

        skill.healDeal.forEach(entry => {
            const isStamped = isStampedSkill && isUltStamped;
            const baseMax = (isStamped && entry.val.stampMax !== undefined) ? entry.val.stampMax : entry.val.max;
            
            const currentStartRate = (isStamped && entry.val.stampStartRate !== undefined) 
                                     ? entry.val.stampStartRate 
                                     : (entry.val.startRate !== undefined ? entry.val.startRate : skill.startRate);
            
            const coeff = (baseMax * getSkillMultiplier(lv, currentStartRate));
            let val = 0;

            switch (entry.type) {
                case "보통회복":
                    val = 최종공격력 * (coeff / 100) * (1 + sub_회복증가) * (1 + sub_평타뎀증);
                    break;
                case "필살회복":
                    val = 최종공격력 * (coeff / 100) * (1 + sub_회복증가) * (1 + sub_필살기뎀증);
                    break;
                case "추가회복":
                    val = 최종공격력 * (coeff / 100) * (1 + sub_회복증가) * (1 + sub_트리거뎀증);
                    break;
                case "지속회복":
                    val = 최종공격력 * (coeff / 100) * (1 + sub_회복증가) * (1 + sub_지속회복증가);
                    break;
                case "회복": 
                default:
                    val = 최종공격력 * (coeff / 100) * (1 + sub_회복증가);
                    break;
            }
            const finalVal = Math.floor(val);
            if (finalVal > 0) {
                if (isForCard) {
                    if (result.text) result.text += ' / ';
                    let typeLabel = entry.type || "회복";
                    const typeName = typeLabel.replace("회복", "");
                    result.text += typeName ? `회복(${typeName}): ${finalVal.toLocaleString()}` : `회복: ${finalVal.toLocaleString()}`;
                }
            }
        });
    }

    // 배리어 계산 로직
    if (skill.barrierDeal) {
        const sub_평타뎀증 = (calculatedSubStats["평타뎀증"] || 0) / 100;
        const sub_필살기뎀증 = (calculatedSubStats["필살기뎀증"] || 0) / 100;
        const sub_트리거뎀증 = (calculatedSubStats["트리거뎀증"] || 0) / 100;
        const sub_배리어증가 = (calculatedSubStats["배리어증가"] || 0) / 100;

        skill.barrierDeal.forEach(entry => {
            const isStamped = isStampedSkill && isUltStamped;
            const baseMax = (isStamped && entry.val.stampMax !== undefined) ? entry.val.stampMax : entry.val.max;
            
            const currentStartRate = (isStamped && entry.val.stampStartRate !== undefined) 
                                     ? entry.val.stampStartRate 
                                     : (entry.val.startRate !== undefined ? entry.val.startRate : skill.startRate);
            
            const coeff = (baseMax * getSkillMultiplier(lv, currentStartRate));
            let val = 0;

            switch (entry.type) {
                case "보통배리어":
                    val = 최종공격력 * (coeff / 100) * (1 + sub_평타뎀증) * (1 + sub_배리어증가);
                    break;
                case "필살배리어":
                    val = 최종공격력 * (coeff / 100) * (1 + sub_필살기뎀증) * (1 + sub_배리어증가);
                    break;
                case "추가배리어":
                    val = 최종공격력 * (coeff / 100) * (1 + sub_트리거뎀증) * (1 + sub_배리어증가);
                    break;
                case "배리어": 
                case "지속배리어":
                    val = 최종공격력 * (coeff / 100) * (1 + sub_배리어증가);
                    break;
                case "HP보통배리어":
                    val = 최종HP * (coeff / 100) * (1 + sub_평타뎀증) * (1 + sub_배리어증가);
                    break;
                case "HP필살배리어":
                    val = 최종HP * (coeff / 100) * (1 + sub_필살기뎀증) * (1 + sub_배리어증가);
                    break;
                case "HP추가배리어":
                    val = 최종HP * (coeff / 100) * (1 + sub_트리거뎀증) * (1 + sub_배리어증가);
                    break;
                case "HP배리어":
                case "HP지속배리어":
                    val = 최종HP * (coeff / 100) * (1 + sub_배리어증가);
                    break;
            }
            const finalVal = Math.floor(val);
            if (finalVal > 0) {
                if (isForCard) {
                    if (result.text) result.text += ' / ';
                    
                    let label = "";
                    if (entry.type.startsWith("HP")) {
                        const core = entry.type.replace("HP", "").replace("배리어", "").replace("지속", "지속");
                        label = core ? `HP배리어(${core})` : "HP배리어";
                    } else {
                        const core = entry.type.replace("배리어", "").replace("지속", "지속");
                        label = core ? `배리어(${core})` : "배리어";
                    }
                    
                    result.text += `${label}: ${finalVal.toLocaleString()}`;
                }
            }
        });
    }

    // [추가] 스킬 카드에서 데미지 뒤에 가산 수치 병기
    if (isForCard && additionText) {
        if (result.text) result.text += ` / ${additionText}`;
        else result.text = additionText;
    }

    // 중간 섹션용 순수 데미지 텍스트 보관
    result.pureDmgText = result.text; 

    // 최유현 특수 처리
    if (isForCard && skill.id === "choiyuhyun_skill7") {
        const entry5 = skill.damageDeal[0];
        const baseMax5 = entry5.val.max;
        const coeff5 = baseMax5 * getSkillMultiplier(lv, skill.startRate);
        const dmg5_unit = calculateDamage(entry5.type, entry5.type === "기초공격" ? 기초공격력 : 최종공격력, calculatedSubStats, coeff5, false, undefined, undefined);
        result.text += `  추가공격: ${Math.floor(dmg5_unit).toLocaleString()}`;
    }

    // 도장 추가 데미지 처리
    if (isForCard && idx === 1 && isUltStamped) {
        const charDataObj = charData[state.currentId];
        const extraSkill = charDataObj?.skills.find(s => s.isUltExtra);
        
        if (extraSkill && extraSkill.damageDeal) {
            let extraLv = (state.currentSkillLevels && state.currentSkillLevels[2]) || 1;
            if (extraSkill.syncLevelWith) {
                const targetIdx = charDataObj.skills.findIndex(s => s.id === extraSkill.syncLevelWith);
                if (targetIdx !== -1 && state.currentSkillLevels) extraLv = state.currentSkillLevels[targetIdx + 1] || 1;
            }

            let extraDmg = 0;
            extraSkill.damageDeal.forEach(entry => {
                const coeff = (typeof entry.val === 'object') ? (entry.val.max * getSkillMultiplier(extraLv, extraSkill.startRate)) : entry.val;
                extraDmg += calculateDamage(entry.type, entry.type === "기초공격" ? 기초공격력 : 최종공격력, calculatedSubStats, coeff, false, undefined, undefined);
            });

            if (extraDmg > 0) {
                result.text += `  추가데미지: ${Math.floor(extraDmg).toLocaleString()}`;
            }
        }
    }

    return result;
}