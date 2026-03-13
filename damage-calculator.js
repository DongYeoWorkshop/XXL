// damage-calculator.js
import { calculateDamage } from './calculations.js?v=20260313';
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

    // [이동] 현재 스킬과 연동된 하위 스킬(예: 임부언 스킬4 <- 스킬8)의 가산 수치 병기
    // 조기 반환(Early Return) 전에 계산하여 additionText에 병합
    if (isForCard && skill.id) {
        const charDataObj = charData[state.currentId];
        if (charDataObj && charDataObj.skills) {
            const linkedSkills = charDataObj.skills.filter(s => s.syncLevelWith === skill.id && !s.isUltExtra);
            
            linkedSkills.forEach(linkedSkill => {
                if (linkedSkill.ratioEffects && linkedSkill.ratioEffects["고정공증"]) {
                    const ratioData = linkedSkill.ratioEffects["고정공증"];
                    if (ratioData.from === "기초공격력") {
                        const baseMax = ratioData.max || 0;
                        const rate = getSkillMultiplier(lv, linkedSkill.startRate || skill.startRate);
                        const ratioPercent = baseMax * rate;
                        const val = 기초공격력 * (ratioPercent / 100);
                        
                        // 기존 additionText 뒤에 이어 붙임
                        if (additionText) additionText += ` / 가산: +${Math.floor(val).toLocaleString()}`;
                        else additionText = `가산: +${Math.floor(val).toLocaleString()}`;
                    }
                }
            });
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
            // [추가] 던컨 찰스 필살기 자체 공증 반영
            if (state.currentId === 'duncan') {
                const s2 = charDataObj.skills[1];
                const s2Lv = (state.currentSkillLevels && state.currentSkillLevels[2]) || 1;
                const rate = getSkillMultiplier(s2Lv, s2.startRate || 0.6);
                currentCalcSubStats["공증"] = (currentCalcSubStats["공증"] || 0) + (30 * rate);
            }

            const boosterSkillIdx = charDataObj.skills.findIndex(s => s.isUltBooster);
            if (boosterSkillIdx !== -1) {
                const boosterSkill = charDataObj.skills[boosterSkillIdx];
                // [수정] 이미 기본 버프로 적용되어 있다면 중복 가산 방지
                const isAlreadyApplied = charDataObj.defaultBuffSkills?.includes(boosterSkill.id);
                
                if (!isAlreadyApplied) {
                    const currentBreakthrough = state.savedStats[state.currentId]?.s1 || 0;
                    const isUnlocked = (boosterSkillIdx === 6) ? (currentBreakthrough >= 75) : true; 

                    if (isUnlocked) {
                        const boosterLv = (state.currentSkillLevels && state.currentSkillLevels[boosterSkillIdx + 1]) || 1;
                        if (boosterSkill.calc && boosterSkill.calc.length > 0) {
                            const maxVal = boosterSkill.calc[0].max;
                            if (maxVal) {
                                const rate = getSkillMultiplier(boosterLv, boosterSkill.startRate || 0.6);
                                const boostVal = maxVal * rate;
                                currentCalcSubStats["뎀증"] = (currentCalcSubStats["뎀증"] || 0) + boostVal;
                            }
                        }
                    }
                }
            }
        }
    }

    let totalDmg = 0;
    // [수정] isUltExtra(도장 파생 스킬)도 도장 효과를 받는 스킬로 간주
    const isStampedSkill = (idx === 1 || skill.hasStampEffect === true || skill.isUltExtra === true); 
    
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
        
        let baseMax = 0;
        let isFixedVal = false;
        
        // [수정] fixed 또는 stampFixed가 있으면 우선 사용
        if (isStamped && entry.val.stampFixed !== undefined) {
            baseMax = entry.val.stampFixed;
            isFixedVal = true;
        } else if (entry.val.fixed !== undefined) {
            baseMax = entry.val.fixed;
            isFixedVal = true;
        } else {
            baseMax = (isStamped && entry.val.stampMax !== undefined) ? entry.val.stampMax : (entry.val.max || 0);
        }
        
        const currentStartRate = (isStamped && entry.val.stampStartRate !== undefined) 
                                 ? entry.val.stampStartRate 
                                 : (entry.val.startRate !== undefined ? entry.val.startRate : skill.startRate);
        
        // [수정] 고정 수치(fixed)인 경우 레벨 배율을 곱하지 않음
        const coeff = (typeof entry.val === 'object') 
                      ? (isFixedVal ? baseMax : (baseMax * getSkillMultiplier(lv, currentStartRate))) 
                      : entry.val;
        
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
                let label = entry.type || "데미지";
                if (label === "도트공격") label = "고정데미지";
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
                case "HP보통회복":
                    val = 최종HP * (coeff / 100) * (1 + sub_회복증가) * (1 + sub_평타뎀증);
                    break;
                case "HP필살회복":
                    val = 최종HP * (coeff / 100) * (1 + sub_회복증가) * (1 + sub_필살기뎀증);
                    break;
                case "HP추가회복":
                    val = 최종HP * (coeff / 100) * (1 + sub_회복증가) * (1 + sub_트리거뎀증);
                    break;
                case "HP지속회복":
                    val = 최종HP * (coeff / 100) * (1 + sub_회복증가) * (1 + sub_지속회복증가);
                    break;
                case "HP회복":
                    val = 최종HP * (coeff / 100) * (1 + sub_회복증가);
                    break;
                case "회복": 
                default:
                    val = (entry.type && entry.type.startsWith("HP")) 
                          ? 최종HP * (coeff / 100) * (1 + sub_회복증가)
                          : 최종공격력 * (coeff / 100) * (1 + sub_회복증가);
                    break;
            }
            const finalVal = Math.floor(val);
            if (finalVal > 0) {
                if (isForCard) {
                    if (result.text) result.text += ' / ';
                    let typeLabel = entry.type || "회복";
                    let typeName = typeLabel.replace("회복", "");
                    
                    // HP로 시작하는 경우 HP/로 변경
                    if (typeName.startsWith("HP")) {
                        typeName = typeName.replace("HP", "HP/");
                    }
                    
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

    // 도장/추가 효과 스킬 처리 (isUltExtra)
    // [수정] 도장이 없어도 기본 효과가 있는 경우 표시하기 위해 isUltStamped 조건 제거
    if (isForCard && idx === 1) {
        const charDataObj = charData[state.currentId];
        const extraSkill = charDataObj?.skills.find(s => s.isUltExtra);
        
        if (extraSkill && extraSkill.damageDeal) {
            let extraLv = (state.currentSkillLevels && state.currentSkillLevels[2]) || 1;
            if (extraSkill.syncLevelWith) {
                const targetIdx = charDataObj.skills.findIndex(s => s.id === extraSkill.syncLevelWith);
                if (targetIdx !== -1 && state.currentSkillLevels) extraLv = state.currentSkillLevels[targetIdx + 1] || 1;
            }

            let extraDmg = 0;
            let isBaseAtkType = false;
            
            extraSkill.damageDeal.forEach(entry => {
                // [수정] 도장 여부에 따라 계수 선택 (도장 없으면 max, 있으면 stampMax)
                // 만약 도장이 없는데 max가 없다면(순수 도장 스킬) 0이 됨
                const isStamped = isUltStamped;
                const baseMax = (isStamped && entry.val.stampMax !== undefined) ? entry.val.stampMax : entry.val.max;
                
                if (baseMax) {
                    const currentStartRate = (isStamped && entry.val.stampStartRate !== undefined) 
                                             ? entry.val.stampStartRate 
                                             : (entry.val.startRate !== undefined ? entry.val.startRate : extraSkill.startRate);
                    
                    const coeff = baseMax * getSkillMultiplier(extraLv, currentStartRate);
                    
                    if (entry.type === "기초공격" || entry.type === "도트공격") isBaseAtkType = true;
                    extraDmg += calculateDamage(entry.type, entry.type === "기초공격" ? 기초공격력 : 최종공격력, calculatedSubStats, coeff, isStamped, undefined, undefined);
                }
            });

            if (extraDmg > 0) {
                const label = isBaseAtkType ? "고정데미지" : "추가데미지";
                if (result.text) result.text += ` / ${label}: ${Math.floor(extraDmg).toLocaleString()}`;
                else result.text = `${label}: ${Math.floor(extraDmg).toLocaleString()}`;
            }
        }
    }

    return result;
}