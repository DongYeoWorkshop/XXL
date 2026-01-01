// sim_data.js
export const simCharData = {
  "shinrirang": {
    commonControls: ["normal_hit_prob"],
    // 1. 턴 시작 (타이머 청소)
    onTurn: (ctx) => {
        if (!ctx.simState.skill5_timers) ctx.simState.skill5_timers = [];
        ctx.simState.skill5_timers = ctx.simState.skill5_timers.map(v => v - 1).filter(v => v > 0);
        
        // 1턴 버프들은 매 턴 시작 시 0으로 초기화 (확실한 만료 보장)
        ctx.simState.skill4_timer = 0;
        ctx.simState.skill8_timer = 0;
    },
    onCalculateDamage: (ctx) => {
        return { extraHits: [] };
    },
    // 2. 공격 직후 서순 (메인 공격 후)
    onAttack: (ctx) => {
        const extraHits = [];

        // [스킬 7] 매 공격마다 스택 적립 (최대 10)
        ctx.simState.skill7_stacks = Math.min(10, (ctx.simState.skill7_stacks || 0) + 1);

        if (ctx.isUlt) {
            // 필살기 시에는 로그를 extraHits 순서에 포함시켜 확실히 출력
            extraHits.push({
                skillId: "shinrirang_skill7",
                step1: (ctx) => ctx.log(6, "발동")
            });

            // [스킬 4] 패시브 2 판정 (독립 확률)
            extraHits.push({
                skillId: "shinrirang_skill4",
                step1: (ctx) => {
                    // 첫 번째 50% 확률: 버프 발동
                    if (Math.random() < 0.5) {
                        ctx.simState.skill4_timer = 1;
                        return ctx.log(3, "발동", 50, 1, true);
                    }
                },
                step2: (ctx) => {
                    // 별개의 두 번째 50% 확률: 데미지 발생 (80%)
                    if (Math.random() < 0.5) return { val: ctx.getVal(3, '추가공격'), chance: 50 };
                }
            });

            // [스킬 8] 도장 판정 (독립 확률)
            if (ctx.stats.stamp) {
                extraHits.push({
                    skillId: "shinrirang_skill8",
                    step1: (ctx) => {
                        // 첫 번째 50% 확률: 도장 버프 발동 (30%)
                        if (Math.random() < 0.5) {
                            ctx.simState.skill8_timer = 1;
                            return ctx.log(7, "발동", 50, 1, true);
                        }
                    },
                    step2: (ctx) => {
                        // 별개의 두 번째 50% 확률: 데미지 발생 (스킬 2의 세 번째 계수 40%)
                        if (Math.random() < 0.5) {
                            const skill2 = ctx.charData.skills[1];
                            const s2Lv = parseInt(ctx.stats.skills?.s2 || 1);
                            const rate = (typeof getSkillMultiplier === 'function' ? getSkillMultiplier(s2Lv, skill2.startRate || 0.6) : 1);
                            return { val: (skill2.calc[2].max || 40) * rate, chance: 50 };
                        }
                    }
                });
            }
        } else {
            // 보통공격 시에는 기존처럼 즉시 로그 출력
            ctx.log(6, "발동");
        }
        return { extraHits };
    },
    // 3. 피격 직후 서순
    onEnemyHit: (ctx) => {
        const extraHits = [];
        extraHits.push({
            skillId: "shinrirang_skill5",
            isHitAction: true,
            step1: (ctx) => {
                if (!ctx.simState.skill5_timers) ctx.simState.skill5_timers = [];
                // 최대 2중첩 제한 적용
                if (ctx.simState.skill5_timers.length < 2) {
                    ctx.addTimer("skill5_timers", 2);
                    return ctx.log(4, "발동", null, 2, true);
                }
            },
            step2: ctx.getVal(4, '추가공격'), // 반격 계수 (100%)
            step3: (ctx) => {
                // 반격도 공격이므로 풍월의 혼 스택 적립
                ctx.simState.skill7_stacks = Math.min(10, (ctx.simState.skill7_stacks || 0) + 1);
                ctx.log(6, "발동");
            }
        });
        return { extraHits };
    },
    // 실시간 수치 변환기
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "공증": 0, "트리거뎀증": 0 };
        bonuses["공증"] += (ctx.simState.skill7_stacks || 0) * ctx.getVal(6, '공증');
        bonuses["뎀증"] += (ctx.simState.skill5_timers || []).length * ctx.getVal(4, '뎀증');

        if (ctx.simState.skill4_timer > 0) bonuses["트리거뎀증"] += ctx.getVal(3, '트리거뎀증');
        if (ctx.simState.skill8_timer > 0) {
            // 도장 패시브의 트리거 뎀증 수치 (30%)
            bonuses["트리거뎀증"] += ctx.getVal(7, '트리거뎀증', true);
        }

        return bonuses;
    }
  },
  "tayangsuyi": {
    commonControls: ["ally_warrior_debuffer_count", "ally_ult_count"],
    stateDisplay: {
        "skill4_spirit": "[전의]"
    },

    // 1. 턴 시작 (타이머 관리 및 전의 수급)
    onTurn: (ctx) => {
        if (ctx.simState.skill5_timer > 0) ctx.simState.skill5_timer--;

        if (!ctx.isAllyUltTurn) {
            const allyCount = ctx.customValues.ally_warrior_debuffer_count;
            const rawProb = ctx.getVal(3, 'max');
            const prob = rawProb / 100;
            
            let gained = 0;
            for (let i = 0; i < allyCount; i++) {
                if (Math.random() < prob) gained++;
            }
            if (allyCount > 0 && gained > 0) {
                ctx.simState.skill4_spirit = Math.min(9, (ctx.simState.skill4_spirit || 0) + gained);
                ctx.log("[전의]", `${gained}회 발동 (${rawProb.toFixed(0)}%)`);
            }
        } else {
            // 아군 필살기 턴일 때 스킬 7 로그 출력 (횟수 포함)
            const allyUltCount = ctx.customValues.ally_ult_count || 0;
            if (allyUltCount > 0) {
                ctx.log(6, `${allyUltCount}회 발동`, null, 1); 
            }
        }
    },
    onCalculateDamage: (ctx) => {
        return { extraHits: [] };
    },
    // 2. 공격 서순
    onAttack: (ctx) => {
        return { extraHits: [] };
    },
    onEnemyHit: (ctx) => {
        return { extraHits: [] };
    },
    // 3. 행동 종료 후 (방어 체크 및 전의 소모)
    onAfterAction: (ctx) => {
        const extraHits = [];
        if (ctx.isDefend) {
            ctx.setTimer("skill5_timer", 2);
            extraHits.push({
                skillId: "tayangsuyi_skill5", 
                step1: (ctx) => ctx.log(4, "발동", null, 2, true) 
            });
        }
        if (ctx.isUlt && !ctx.stats.stamp) {
            ctx.simState.skill4_spirit = 0;
            ctx.log("[전의]", "모두 소모");
        }
        return { extraHits };
    },
    // 4. 실시간 수치 변환기
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "공증": 0, "평타뎀증": 0, "필살기뎀증": 0, "기초공증": 0, "기초HP증가": 0 };
        const spiritStacks = ctx.simState.skill4_spirit || 0;
        const spiritBonusPerStack = 6; 
        bonuses["필살기뎀증"] += spiritStacks * spiritBonusPerStack;

        if (ctx.isAllyUltTurn) {
            const allyUltCount = ctx.customValues.ally_ult_count || 0;
            bonuses["필살기뎀증"] += allyUltCount * ctx.getVal(6, '필살기뎀증');
        }

        if (!ctx.isUlt && ctx.simState.skill5_timer > 0) {
            bonuses["평타뎀증"] += ctx.getVal(4, '평타뎀증');
        }

        if (ctx.stats.stamp && spiritStacks === 9) {
            bonuses["뎀증"] += 20; 
        }

        return bonuses;
    }
  },
  "choiyuhyun": {
    commonControls: ["hp_100_prob"],
        onTurn: (ctx) => {
            if (ctx.simState.skill5_timer > 0) ctx.simState.skill5_timer--;
    
            // 매 턴 시작 시 확률에 따라 HP 100% 유지 여부 결정
            const prob = ctx.customValues.hp_100_prob ?? 100;
            // 성공 시 1(턴), 실패 시 0을 대입하여 UI에 '1턴'으로 표시되게 함
            ctx.simState.skill4_active = (Math.random() * 100 < prob) ? 1 : 0;
    
            if (ctx.simState.skill4_active > 0 && prob < 100) {
                // 유지율이 100% 미만일 때 성공한 경우에만 로그 출력 (가독성)
                ctx.log(3, "발동", null, 1);
            }
        },
        onAttack: (ctx) => {
            const extraHits = [];
            const enemyCount = ctx.targetCount; // 공통 대상 수 버튼 값 사용
    
            // [패시브4] 신화성신환: 방어 후 공격 시 추가데미지 발생
            if (ctx.simState.skill5_timer > 0) {
                extraHits.push({
                    skillId: "choiyuhyun_skill5",
                    name: "신화성신환",
                    coef: ctx.getVal(4, 'max')
                });
            }
    
            // [패시브5] 검추백형: 필살기 사용 시 적 수에 따른 추가데미지
            if (ctx.isUlt) {
                if (enemyCount >= 5) {
                    extraHits.push({
                        skillId: "choiyuhyun_skill7",
                        name: "검추백형",
                        coef: ctx.getVal(6, 'max'),
                        isMulti: true
                    });
                } else if (enemyCount === 1) {
                    extraHits.push({
                        skillId: "choiyuhyun_skill7",
                        name: "검추백형",
                        coef: ctx.getVal(6, 'max') * 2 // 적이 1명일 때 75% (37.5 * 2)
                    });
                }
            }
    
            return { extraHits };
        },
    onAfterAction: (ctx) => {
        // [패시브4] 방어 시 2턴 간 추가데미지 상태 부여
        if (ctx.isDefend) {
            ctx.setTimer("skill5_timer", 2);
            ctx.log(4, "발동", null, 2);
        }
    },
        getLiveBonuses: (ctx) => {
            const bonuses = { "뎀증": 0 };
            const enemyCount = ctx.targetCount; // 공통 대상 수 버튼 값 사용
    
            // [패시브2] 일죽별운: HP 100% 시 데미지 증가
            if (ctx.simState.skill4_active > 0) {
                bonuses["뎀증"] += ctx.getVal(3, '뎀증');
            }
    
            // [도장] 사신현정검: 적의 수가 5명 이상일 시 데미지 증가
            if (ctx.stats.stamp && enemyCount >= 5) {
                bonuses["뎀증"] += ctx.getVal(7, '뎀증', true);
            }
    
            return bonuses;
        }
  },
  "baade": {
    commonControls: [],
    stateDisplay: {
        "skill2_scar": "[각흔]"
    },
    onTurn: (ctx) => {
        // 스킬 7(집중 분쇄) 버프 타이머 관리
        if (ctx.simState.skill7_timer > 0) ctx.simState.skill7_timer--;
    },
    onAttack: (ctx) => {
        const extraHits = [];
        const hasScar = ctx.simState.skill2_scar;

        if (!ctx.isUlt) {
            // [패시브5] 집중 분쇄: 각흔 대상 평타 시 필살기 버프
            if (hasScar) {
                ctx.setTimer("skill7_timer", 2);
                ctx.log(6, "발동", null, 2);
            }
        } else {
            // 필살기: 각흔 유무에 따라 동작 분기
            if (hasScar) {
                // [도장] 쇄강 파공격: 각흔 상태에서 필살기 시 추가데미지
                if (ctx.stats.stamp) {
                    extraHits.push({
                        skillId: "baade_stamp_passive",
                        coef: 174.75 // 도장 추가타 계수
                    });
                }
                // 각흔 소모
                ctx.simState.skill2_scar = false;
                ctx.log("[각흔]", "소모");
            } else {
                // 각흔 부여
                ctx.simState.skill2_scar = true;
                ctx.log("[각흔]", "부여");
            }
        }
        return { extraHits };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "평타뎀증": 0, "필살기뎀증": 0 };
        const hasScar = ctx.simState.skill2_scar;

        if (hasScar) {
            // [패시브2] 그리움의 사랑 자장가: 필살기 뎀증
            bonuses["필살기뎀증"] += ctx.getVal(3, '필살기뎀증');
            // [패시브4] 광맥 직감: 평타 뎀증
            bonuses["평타뎀증"] += ctx.getVal(4, '평타뎀증');
        }

        // [패시브5] 집중 분쇄: 평타로 쌓은 필살기 뎀증
        if (ctx.simState.skill7_timer > 0) {
            bonuses["필살기뎀증"] += ctx.getVal(6, '필살기뎀증');
        }

        return bonuses;
    }
  },
  "khafka": {
    commonControls: ["is_paralysis_immune"],
    onTurn: (ctx) => {
        // 모든 받뎀증 디버프 타이머 감소
        if (!ctx.simState.skill4_vuln) ctx.simState.skill4_vuln = [];
        ctx.simState.skill4_vuln = ctx.simState.skill4_vuln
            .map(v => ({ ...v, dur: v.dur - 1 }))
            .filter(v => v.dur > 0);
    },
    onAttack: (ctx) => {
        const extraHits = [];
        // 방어 시에는 공격 패시브(긴박 공감 등)가 발동하지 않음
        if (ctx.isDefend) return { extraHits };

        if (!ctx.simState.skill4_vuln) ctx.simState.skill4_vuln = [];

        // [패시브2] 긴박 공감: 공격 시 50% 확률로 받뎀증 (2턴)
        if (Math.random() < 0.5) {
            ctx.addTimer("skill4_vuln", 2, { val: ctx.getVal(3, '뎀증디버프'), name: "긴박공감" });
            ctx.log(3, "발동", 50, 2);
        }

        // [패시브5] 급습 밧줄: 필살기 발동 시 받뎀증 (1턴)
        if (ctx.isUlt) {
            ctx.addTimer("skill4_vuln", 1, { val: ctx.getVal(6, '뎀증디버프'), name: "급습밧줄" });
            ctx.log(6, "발동", null, 1);
        }

        return { extraHits };
    },
    onAfterAction: (ctx) => {
        // [패시브4] 밧줄 낙인: 방어 시 받뎀증 16% (2턴)
        if (ctx.isDefend) {
            ctx.addTimer("skill4_vuln", 2, { val: ctx.getVal(4, '뎀증디버프'), name: "밧줄낙인" });
            ctx.log(4, "발동", null, 2);
        }
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증디버프": 0, "필살기뎀증": 0 };

        // 활성화된 모든 받뎀증 합산
        if (ctx.simState.skill4_vuln) {
            ctx.simState.skill4_vuln.forEach(v => {
                bonuses["뎀증디버프"] += v.val;
            });
        }

        // [특수] 긴박 공감[마비]: 마비 면역 대상 필살기 뎀증
        if (ctx.isUlt && ctx.customValues.is_paralysis_immune) {
            bonuses["필살기뎀증"] += ctx.getVal(7, '필살기뎀증');
        }

        return bonuses;
    }
  },
  "anuberus": {
    commonControls: [],
    stateDisplay: {
        "skill4_black_dog": "[흑구]",
        "skill4_white_dog": "[백구]"
    },
    onTurn: (ctx) => {
        // 흑구, 백구 타이머 감소
        if (ctx.simState.skill4_black_dog > 0) ctx.simState.skill4_black_dog--;
        if (ctx.simState.skill4_white_dog > 0) ctx.simState.skill4_white_dog--;

        // 어둠속성 디버프 타이머 관리 (3턴 지속)
        if (!ctx.simState.skill4_vuln) ctx.simState.skill4_vuln = [];
        ctx.simState.skill4_vuln = ctx.simState.skill4_vuln
            .map(v => ({ ...v, dur: v.dur - 1 }))
            .filter(v => v.dur > 0);
            
        // 지옥의 사냥개 스택 타이머 관리 (3턴 지속)
        if (!ctx.simState.skill5_hound_stack) ctx.simState.skill5_hound_stack = [];
        ctx.simState.skill5_hound_stack = ctx.simState.skill5_hound_stack
            .map(v => ({ ...v, dur: v.dur - 1 }))
            .filter(v => v.dur > 0);
    },
    onAttack: (ctx) => {
        if (ctx.isDefend) return { extraHits: [] };

        const activeDogs = (ctx.simState.skill4_black_dog > 0 ? 1 : 0) + (ctx.simState.skill4_white_dog > 0 ? 1 : 0);

        return {
            extraHits: [
                // 1. [S5 데미지] 필살기 시 기존 스택 비례 추가타
                (ctx.isUlt && ctx.simState.skill5_hound_stack?.length > 0) && {
                    skillId: "anuberus_skill5",
                    name: "유령의 심장 심판",
                    stack: ctx.simState.skill5_hound_stack.length,
                    coef: ctx.simState.skill5_hound_stack.reduce((sum, h) => sum + h.val, 0)
                },

                // 2. [버프 갱신 그룹] 개 수만큼 버프를 먼저 모두 갱신합니다 (버프1 -> 버프2)
                activeDogs > 0 && Array.from({ length: activeDogs }, () => ({
                    skillId: "anuberus_skill4",
                    step1: (ctx) => {
                        // 패시브3 스택 적립
                        if (ctx.simState.skill5_hound_stack.length < 4) {
                            ctx.addTimer("skill5_hound_stack", 3, { val: ctx.getVal(4, 'max') });
                        }
                        // 패시브2 디버프 부여 및 로그
                        if (ctx.simState.skill4_vuln.length < 4) {
                            ctx.addTimer("skill4_vuln", 3, { val: ctx.getVal(3, '속성디버프') });
                            return ctx.log(3, "발동", null, 3, true);
                        }
                    }
                })),

                // 3. [도장 데미지 그룹] 모든 버프가 걸린 후 데미지를 입힙니다 (도장1 -> 도장2)
                (activeDogs > 0 && ctx.stats.stamp) && Array.from({ length: activeDogs }, (_, i) => ({
                    skillId: "anuberus_stamp_passive",
                    name: `니히히~ 우리도 왔다!`,
                    coef: ctx.getVal(7, '추가공격')
                })),

                // 4. 상태 판정 (흑구/백구 깨우기) - 마지막 단계
                {
                    step1: (ctx) => {
                        const prob = ctx.getVal(3, 'max');
                        const res = [];
                        if (Math.random() * 100 < prob) { ctx.setTimer("skill4_black_dog", 2); res.push(ctx.log("[흑구]", "발동", prob.toFixed(0), 2, true)); }
                        if (Math.random() * 100 < prob) { ctx.setTimer("skill4_white_dog", 2); res.push(ctx.log("[백구]", "발동", prob.toFixed(0), 2, true)); }
                        return res;
                    }
                }
            ]
        };
    },
    onAfterAction: (ctx) => {
        // 방어 시에도 개들을 깨울 확률 존재
        if (ctx.isDefend) {
            const prob = ctx.getVal(3, 'max');
            if (Math.random() * 100 < prob) { 
                ctx.setTimer("skill4_black_dog", 2); 
                ctx.log("[흑구]", "발동", prob.toFixed(0), 2); 
            }
            if (Math.random() * 100 < prob) { 
                ctx.setTimer("skill4_white_dog", 2); 
                ctx.log("[백구]", "발동", prob.toFixed(0), 2); 
            }
        }
    },

    getLiveBonuses: (ctx) => {
        const bonuses = { "속성디버프": 0, "필살기뎀증": 0, "공증": 0 };

        // [패시브2] 어둠속성 공격 강화: 본인 적용 (18%)
        bonuses["공증"] += 18;

        // 활성화된 어둠속성 디버프 합산
        if (ctx.simState.skill4_vuln) {
            ctx.simState.skill4_vuln.forEach(v => {
                bonuses["속성디버프"] += v.val;
            });
        }

        // [패시브6] 무음모드 해제: 깨어있는 개 한 마리당 필살기 뎀증 (각 27%)
        const activeDogs = (ctx.simState.skill4_black_dog > 0 ? 1 : 0) + (ctx.simState.skill4_white_dog > 0 ? 1 : 0);
        if (activeDogs > 0) {
            bonuses["필살기뎀증"] += ctx.getVal(6, '필살기뎀증') * activeDogs;
        }

        return bonuses;
    }
  }
};