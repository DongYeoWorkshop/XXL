// calculations.js
let isCurrentChar = null; // 레퍼런스 에러 방지용 임시 선언

// 5가지 공격 분류: 보통공격, 필살공격, 추가공격, 도트공격, 기초공격

export function calculateCharacterStats(charId, charData, skillLevels, isUltStamped, getSkillMultiplierFn, appliedBuffs, allCharData, allSavedStats, liveContext = {}) {
    let stats = {
        "뎀증": 0,
        "평타뎀증": 0,
        "필살기뎀증": 0,
        "트리거뎀증": 0,
        "뎀증디버프": 0,
        "속성디버프": 0,
        "공증": 0.0,
        "고정공증": 0,
        "기초공증": 0,
        "HP증가": 0,
        "기초HP증가": 0,
        "회복증가": 0,
        "배리어증가": 0, // 신규 추가
        "지속회복증가": 0, // 신규 추가
        "extraDamages": [] // 상세창에 표시될 추가 데미지 리스트
    };

    const { liveLv, liveBr, liveFit } = liveContext;

    for (const appliedCharId in appliedBuffs) {
        const buffOwnerData = allCharData ? allCharData[appliedCharId] : undefined;
        if (!buffOwnerData || !buffOwnerData.skills) continue;

        appliedBuffs[appliedCharId].forEach(buff => {
            const buffSkill = buffOwnerData.skills.find(s => s.id === buff.skillId);
            if (!buffSkill) return;

            const isOwnerCurrent = (appliedCharId === charId);

            // ... (레벨 및 돌파 체크 로직은 동일) ...
            const getEffectiveLevel = () => {
                const targetId = buffSkill.syncLevelWith || buff.skillId;
                if (isOwnerCurrent) {
                    const skillIndex = buffOwnerData.skills.findIndex(s => s.id === targetId) + 1;
                    return skillLevels[skillIndex] || 1;
                } else if (allSavedStats && allSavedStats[appliedCharId] && allSavedStats[appliedCharId].skills) {
                    const skillIndex = buffOwnerData.skills.findIndex(s => s.id === targetId) + 1;
                    return allSavedStats[appliedCharId].skills[`s${skillIndex}`] || 1;
                }
                return 1;
            };

            let isUnlockedByBreakthrough = true;
            const skillIdx = buffOwnerData.skills.findIndex(s => s.id === buff.skillId);
            const breakthroughValue = isOwnerCurrent 
                ? (liveBr !== undefined ? liveBr : parseInt(allSavedStats?.[charId]?.s1 || 0))
                : parseInt(allSavedStats?.[appliedCharId]?.s1 || 0);
            
            const thresholds = [0, 0, 0, 0, 30, 50, 75]; 
            // [수정] 테스트 더미는 돌파 제한 무시
            if (appliedCharId !== 'test_dummy') {
                if (skillIdx >= 4 && skillIdx <= 6) {
                    isUnlockedByBreakthrough = (breakthroughValue >= thresholds[skillIdx]);
                }
            }
            if (!isUnlockedByBreakthrough) return;

            // [추가] 도장 활성화 여부 체크 (스킬 자체가 도장을 요구하는 경우)
            const isOwnerUltStamped = isOwnerCurrent 
                ? (liveContext.liveStamp !== undefined ? liveContext.liveStamp : (allSavedStats?.[appliedCharId]?.stamp || false))
                : (allSavedStats?.[appliedCharId]?.stamp || false);
            
            // [수정] 도장 필수 여부 체크
            // hasStampEffect는 수치만 바꿀 뿐이므로 버프 적용 자체를 막지 않음
            const strictlyRequiresStamp = !!(buffSkill.stampBuffEffects || buffSkill.isUltExtra);
            if (strictlyRequiresStamp && !isOwnerUltStamped) return;

            let isToggleActive = true;
            if (buffSkill.hasToggle) {
                const toggleType = buffSkill.toggleType || 'isAppliedStamped';
                isToggleActive = buff[toggleType];
            }
            if (!isToggleActive) return;

            // [추가] 커스텀 컨트롤 조건 체크 (예: 전의 9스택)
            if (buffSkill.customLink) {
                const customVal = isOwnerCurrent 
                    ? (liveContext.liveCustomValues ? liveContext.liveCustomValues[buffSkill.customLink.id] : undefined)
                    : (allSavedStats?.[appliedCharId]?.customValues ? allSavedStats[appliedCharId].customValues[buffSkill.customLink.id] : undefined);
                
                const currentVal = customVal ?? buffSkill.customLink.initial ?? 0;
                if (buffSkill.customLink.condition === 'eq') {
                    if (currentVal !== buffSkill.customLink.value) return;
                } else if (buffSkill.customLink.multiply) {
                    if (currentVal <= 0) return;
                }
            }

            // [추가] "추가데미지" 버프 수집 (상세창에서 독립 스킬처럼 표시하기 위함)
            const processExtraDamage = (effectObj) => {
                if (effectObj && effectObj["추가데미지"]) {
                    const levelToUse = getEffectiveLevel();
                    const rate = getSkillMultiplierFn(Math.max(1, Math.min(levelToUse, 10)), buffSkill.startRate);
                    
                    let baseVal = 0;
                    if (typeof effectObj["추가데미지"] === 'object') {
                        baseVal = effectObj["추가데미지"].max !== undefined ? effectObj["추가데미지"].max * rate : effectObj["추가데미지"].fixed;
                    } else {
                        baseVal = effectObj["추가데미지"] * rate;
                    }

                    // 중첩형 버프인 경우 중첩수 곱해줌
                    if (buffSkill.hasCounter) {
                        const stackMultiplier = (buff.count !== undefined ? buff.count : 0);
                        baseVal *= stackMultiplier;
                    }
                    
                    if (baseVal > 0) {
                        stats.extraDamages.push({
                            isExternal: true,
                            charId: appliedCharId,
                            skillId: buffSkill.id,
                            name: buffSkill.name,
                            icon: buffSkill.icon,
                            level: levelToUse,
                            type: "추가공격",
                            value: baseVal,
                            damageDeal: [{ type: "추가공격", val: baseVal }],
                            desc: buffSkill.buffDesc || buffSkill.desc
                        });
                    }
                }
            };

            // 일반 버프 효과에서 수집
            processExtraDamage(buffSkill.buffEffects);
            
            // 도장 버프 효과에서 수집 (도장이 켜져 있을 때만)
            if (isOwnerUltStamped) {
                processExtraDamage(buffSkill.stampBuffEffects);
            }

            // 기존 일반 버프 처리 (추가데미지는 수치 합산에서 제외됨)
            if (buffSkill.buffEffects) {
                // [추가] 일반 버프라도 자동 조건이 있다면 체크
                let shouldApplyAuto = true;
                if (buffSkill.autoCondition === "isTargetCount5") {
                    const currentTargetCount = (isOwnerCurrent && liveContext.liveTargetCount !== undefined) 
                                               ? liveContext.liveTargetCount 
                                               : (allSavedStats?.[charId]?.commonMultiTargetCount || 1);
                    shouldApplyAuto = (currentTargetCount >= 5);
                }

                if (shouldApplyAuto) {
                    const levelToUse = getEffectiveLevel();
                    const rate = getSkillMultiplierFn(Math.max(1, Math.min(levelToUse, 10)), buffSkill.startRate);
                    let stackMultiplier = buffSkill.hasCounter ? (buff.count !== undefined ? buff.count : 0) : 1;

                    // [추가] 커스텀 컨트롤 연동 로직
                    if (buffSkill.customLink && liveContext.liveCustomValues) {
                        const customVal = liveContext.liveCustomValues[buffSkill.customLink.id];
                        if (customVal !== undefined) {
                            if (buffSkill.customLink.condition === 'eq') {
                                // 특정 값과 같을 때만 적용 (예: 전의 9스택)
                                if (customVal !== buffSkill.customLink.value) stackMultiplier = 0;
                            } else if (buffSkill.customLink.multiply) {
                                // 값만큼 중첩 적용 (예: 전의 스택 수만큼 데미지 증가)
                                stackMultiplier = customVal;
                            }
                        }
                    }

                    for (const effectStat in buffSkill.buffEffects) {
                        if (stats.hasOwnProperty(effectStat)) { 
                            const effectData = buffSkill.buffEffects[effectStat];
                            let valueToAdd = 0;

                            // [수정] 커스텀 입력(테스트 더미) 값 우선 적용
                            if (buffSkill.isCustomInput && buff.customValue !== undefined) {
                                valueToAdd = buff.customValue;
                            } else if (typeof effectData === 'object' && effectData !== null) {
                                // [수정] 속성별 차등 수치 및 적용 제한 로직
                                let baseMax = effectData.max;
                                const targetCharData = allCharData[charId];
                                const targetAttr = targetCharData?.info?.속성;

                                if (effectData.targetAttribute !== undefined) {
                                    if (targetAttr !== effectData.targetAttribute) {
                                        // 대상 속성이 다른데 attributeMax(차등수치)도 없다면 아예 무시
                                        if (effectData.attributeMax === undefined) return; 
                                    } else {
                                        // 대상 속성이 맞다면 attributeMax 사용 (있을 경우)
                                        if (effectData.attributeMax !== undefined) {
                                            baseMax = effectData.attributeMax;
                                        }
                                    }
                                }
                                valueToAdd = (baseMax !== undefined ? baseMax * rate : effectData.fixed) || 0;
                            } else if (typeof effectData === 'number') {
                                valueToAdd = effectData;
                            }
                            
                            // 커스텀 입력이 아닐 때만 스택 곱하기 (커스텀은 사용자가 최종값을 입력한다고 가정)
                            if (!buffSkill.isCustomInput) {
                                valueToAdd *= stackMultiplier;
                            }
                            
                            if (typeof buffSkill.decimalPlaces === 'number') valueToAdd = parseFloat(valueToAdd.toFixed(buffSkill.decimalPlaces));
                            stats[effectStat] += valueToAdd;
                        }
                    }
                }
            }

            // 2. 비율 기반 버프 (ratioEffects) 처리
            if (buffSkill.ratioEffects) {
                // [추가] isUltExtra(도장 패시브)인 경우 도장이 켜져 있어야만 적용
                if (buffSkill.isUltExtra) {
                     const isOwnerUltStamped = isOwnerCurrent 
                        ? (liveContext.liveStamp !== undefined ? liveContext.liveStamp : (allSavedStats?.[appliedCharId]?.stamp || false))
                        : (allSavedStats?.[appliedCharId]?.stamp || false);
                    if (!isOwnerUltStamped) return;
                }

                const levelToUse = getEffectiveLevel();
                const rate = getSkillMultiplierFn(Math.max(1, Math.min(levelToUse, 10)), buffSkill.startRate);

                for (const effectStat in buffSkill.ratioEffects) {
                    if (stats.hasOwnProperty(effectStat)) {
                        const ratioData = buffSkill.ratioEffects[effectStat];
                        
                        // [추가] 도장 활성화 여부 확인 및 stampMax 적용
                        const isOwnerUltStamped = isOwnerCurrent 
                            ? (liveContext.liveStamp !== undefined ? liveContext.liveStamp : (allSavedStats?.[appliedCharId]?.stamp || false))
                            : (allSavedStats?.[appliedCharId]?.stamp || false);
                        
                        const baseMax = (isOwnerUltStamped && ratioData.stampMax !== undefined) ? ratioData.stampMax : (ratioData.max || 0);
                        const ratioPercent = baseMax * rate;
                        let baseStatValue = 0;

                        if (ratioData.from === "기초공격력") {
                            const ownerSaved = allSavedStats?.[appliedCharId] || {};
                            const ownerLv = isOwnerCurrent ? liveLv : parseInt(ownerSaved.lv || 1);
                            const ownerBr = isOwnerCurrent ? liveBr : parseInt(ownerSaved.s1 || 0);
                            const ownerFit = isOwnerCurrent ? liveFit : parseInt(ownerSaved.s2 || 0);
                            
                            const pureBaseAtk = buffOwnerData.base["공격력"] * Math.pow(buffOwnerData.growth["공격력"], (ownerLv - 1));
                            
                            // logic.js와 동일하게 복리로 적용
                            const bonus1Rate = ownerBr * 0.02;
                            const bonus2Rate = ownerFit * 0.04;
                            const ownerFitBaseAtk = Math.floor(pureBaseAtk * (1 + bonus1Rate) * (1 + bonus2Rate));

                            let ownerSubBaseAtkRate = 0;
                            buffOwnerData.skills.forEach((s, idx) => {
                                if (s.buffEffects && s.buffEffects["기초공증"]) {
                                    // 돌파 단계에 따른 패시브 해금 체크
                                    const thresholds = [0, 0, 0, 0, 30, 50, 75]; 
                                    if (idx >= 4 && idx <= 6 && ownerBr < thresholds[idx]) return;

                                    let sLv;
                                    if (isOwnerCurrent) {
                                        sLv = skillLevels[idx + 1] || 1;
                                    } else {
                                        sLv = ownerSaved.skills?.[`s${idx + 1}`] || 10;
                                    }
                                    const sRate = getSkillMultiplierFn(Math.max(1, Math.min(sLv, 10)), s.startRate);
                                    const effectData = s.buffEffects["기초공증"];
                                    let valToAdd = 0;
                                    if (typeof effectData === 'object' && effectData !== null) {
                                        valToAdd = (effectData.max !== undefined ? effectData.max * sRate : effectData.fixed) || 0;
                                    } else {
                                        valToAdd = effectData || 0;
                                    }
                                    
                                    // [수정] 중첩(카운터) 수치 반영
                                    if (s.hasCounter) {
                                        const ownerAppliedBuffs = isOwnerCurrent ? appliedBuffs[appliedCharId] : ownerSaved.appliedBuffs?.[appliedCharId];
                                        const buff = ownerAppliedBuffs?.find(b => b.skillId === s.id);
                                        const count = buff ? (buff.count !== undefined ? buff.count : 0) : 0;
                                        valToAdd *= count;
                                    }

                                    if (typeof s.decimalPlaces === 'number') valToAdd = parseFloat(valToAdd.toFixed(s.decimalPlaces));
                                    ownerSubBaseAtkRate += valToAdd;
                                }
                            });
                            baseStatValue = ownerFitBaseAtk * (1 + (ownerSubBaseAtkRate / 100));
                        }

                        let valueToAdd = baseStatValue * (ratioPercent / 100);
                        // [수정] 고정 수치는 합산 전 즉시 내림 처리하여 정수화
                        valueToAdd = Math.floor(valueToAdd);
                        
                        if (typeof buffSkill.decimalPlaces === 'number') valueToAdd = parseFloat(valueToAdd.toFixed(buffSkill.decimalPlaces));
                        stats[effectStat] += valueToAdd;
                    }
                }
            }

            // 3. 도장 버프 (stampBuffEffects) 처리
            if (buffSkill.stampBuffEffects) {
                // [수정] 도장 버프는 무조건 메인 도장이 켜져 있어야 함
                const isOwnerUltStamped = isOwnerCurrent 
                    ? (liveContext.liveStamp !== undefined ? liveContext.liveStamp : (allSavedStats?.[appliedCharId]?.stamp || false))
                    : (allSavedStats?.[appliedCharId]?.stamp || false);
                
                let shouldApply = isOwnerUltStamped;

                // 자체 토글이 있는 경우, 메인 도장 && 자체 토글 둘 다 켜져야 함
                if (shouldApply && buffSkill.hasToggle) {
                    const toggleType = buffSkill.toggleType || 'isAppliedStamped';
                    shouldApply = buff[toggleType];
                }

                if (buffSkill.autoCondition === "isTargetCount5") {
                    const currentTargetCount = allSavedStats?.[charId]?.commonMultiTargetCount || 1;
                    if (currentTargetCount < 5) shouldApply = false;
                }

                if (shouldApply) {
                    const levelToUse = getEffectiveLevel();
                    const rate = getSkillMultiplierFn(Math.max(1, Math.min(levelToUse, 10)), buffSkill.startRate);
                    
                    // [추가] 도장 버프용 커스텀 컨트롤 연동 로직
                    let stampMultiplier = 1;
                    if (buffSkill.customLink && liveContext.liveCustomValues) {
                        const customVal = liveContext.liveCustomValues[buffSkill.customLink.id];
                        if (customVal !== undefined) {
                            if (buffSkill.customLink.condition === 'eq') {
                                if (customVal !== buffSkill.customLink.value) stampMultiplier = 0;
                            } else if (buffSkill.customLink.multiply) {
                                stampMultiplier = customVal;
                            }
                        }
                    }

                    for (const effectStat in buffSkill.stampBuffEffects) {
                        if (stats.hasOwnProperty(effectStat)) {
                            const effectData = buffSkill.stampBuffEffects[effectStat];
                            let valueToAdd = 0;
                            if (typeof effectData === 'object' && effectData !== null) {
                                valueToAdd = (effectData.max !== undefined ? effectData.max * rate : effectData.fixed) || 0;
                            } else if (typeof effectData === 'number') valueToAdd = effectData;
                            
                            // [추가] 커스텀 배율 적용
                            valueToAdd *= stampMultiplier;

                            // [추가] 도장 효과의 고정공증도 내림 처리
                            if (effectStat === "고정공증") valueToAdd = Math.floor(valueToAdd);

                            if (typeof buffSkill.decimalPlaces === 'number') valueToAdd = parseFloat(valueToAdd.toFixed(buffSkill.decimalPlaces));
                            stats[effectStat] += valueToAdd;
                        }
                    }
                }
            }
        });
    }
    return stats;
}

// 상성 배율 계산 헬퍼
function getElementMultiplier(attackerAttr, targetAttr) {
    if (attackerAttr === undefined || targetAttr === undefined) return 1.0;
    const relationships = { 0: { win: 2, lose: 1 }, 1: { win: 0, lose: 2 }, 2: { win: 1, lose: 0 }, 3: { win: 4, lose: null }, 4: { win: 3, lose: null } };
    const rel = relationships[attackerAttr];
    if (!rel) return 1.0;
    if (rel.win === targetAttr) return 1.5;
    if (rel.lose === targetAttr) return 0.75;
    if ((attackerAttr === 3 && targetAttr === 4) || (attackerAttr === 4 && targetAttr === 3)) return 1.5;
    return 1.0;
}

export function calculateDamage(damageType, baseAttack, stats, coefficient, isStamped = false, attackerAttr, targetAttr) {
    let coeffValue = 0;
    if (coefficient) {
        if (typeof coefficient === 'object' && coefficient !== null) { coeffValue = (isStamped && coefficient.stampMax !== undefined) ? coefficient.stampMax : coefficient.max; } 
        else { coeffValue = coefficient; }
    }
    const sub_뎀증 = (stats["뎀증"] || 0) / 100;
    const sub_평타뎀증 = (stats["평타뎀증"] || 0) / 100;
    const sub_필살기뎀증 = (stats["필살기뎀증"] || 0) / 100;
    const sub_트리거뎀증 = (stats["트리거뎀증"] || 0) / 100;
    const sub_뎀증디버프 = (stats["뎀증디버프"] || 0) / 100;
    const sub_속성디버프 = (stats["속성디버프"] || 0) / 100;
    let elementMult = 1.0;
    if (["보통공격", "필살공격", "추가공격"].includes(damageType)) { elementMult = getElementMultiplier(attackerAttr, targetAttr); }
    let finalDamage = 0;
    switch (damageType) {
        case "보통공격": finalDamage = baseAttack * (1 + sub_뎀증) * (1 + sub_평타뎀증) * (1 + sub_뎀증디버프) * (1 + sub_속성디버프) * (coeffValue / 100) * elementMult; break;
        case "필살공격": finalDamage = baseAttack * (1 + sub_뎀증) * (1 + sub_필살기뎀증) * (1 + sub_뎀증디버프) * (1 + sub_속성디버프) * (coeffValue / 100) * elementMult; break;
        case "추가공격": finalDamage = baseAttack * (1 + sub_뎀증) * (1 + sub_트리거뎀증) * (1 + sub_뎀증디버프) * (1 + sub_속성디버프) * (coeffValue / 100) * elementMult; break;
        case "도트공격": case "기초공격": finalDamage = baseAttack * (coeffValue / 100); break;
    }
    return Math.floor(finalDamage);
}