// sim_data.js
import { getSkillMultiplier } from './formatter.js';

export const simCharData = {
  "shinrirang": {
    commonControls: ["normal_hit_prob"],
    // 1. 턴 시작 (타이머 감소는 엔진이 자동 처리)
    onTurn: (ctx) => {
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },
    onCalculateDamage: (ctx) => {
        return { extraHits: [] };
    },
    // 2. 공격 직후 서순
    onAttack: (ctx) => {
        const extraHits = [];

        // [패시브5] 스택 적립 및 로그 생성 헬퍼
        const triggerStack = (ctx) => {
            ctx.simState.skill7_stacks = Math.min(10, (ctx.simState.skill7_stacks || 0) + 1);
            return ctx.log(6, "발동", null, null, true); // 문자열만 반환
        };

        // (1) 메인 공격 스택 (필살기/보통공격 공통)
        extraHits.push({
            skillId: "shinrirang_skill7",
            step1: (ctx) => triggerStack(ctx)
        });

        if (ctx.isUlt) {
            // (2) 패시브2 [늑대] 판정
            extraHits.push({
                skillId: "shinrirang_skill4",
                step1: (ctx) => {
                    if (Math.random() < 0.5) {
                        ctx.simState.skill4_timer = 1;
                        return ctx.log(3, "발동", 50, 1, true);
                    }
                },
                step2: (ctx) => {
                    if (Math.random() < 0.5) {
                        // 데미지만 리턴 (스택 추가 안 함)
                        return { val: ctx.getVal(3, '추가공격'), chance: 50 };
                    }
                }
            });

            // (3) 도장 추가타 판정
            if (ctx.stats.stamp) {
                extraHits.push({
                    skillId: "shinrirang_skill8",
                    step1: (ctx) => {
                        if (Math.random() < 0.5) {
                            ctx.simState.skill8_timer = 1;
                            return ctx.log(7, "발동", 50, 1, true);
                        }
                    },
                    step2: (ctx) => {
                        if (Math.random() < 0.5) {
                            const skill2 = ctx.charData.skills[1];
                            const s2Lv = parseInt(ctx.stats.skills?.s2 || 1);
                            const rate = getSkillMultiplier(s2Lv, skill2.startRate || 0.6);
                            // 데미지만 리턴 (스택 추가 안 함)
                            return { val: (skill2.calc[2].max || 40) * rate, chance: 50 };
                        }
                    }
                });
            }
        }
        return { extraHits };
    },
    // 3. 피격 직후 서순 (반격)
    onEnemyHit: (ctx) => {
        const extraHits = [];
        extraHits.push({
            skillId: "shinrirang_skill5",
            isHitAction: true,
            step1: (ctx) => {
                if (!ctx.simState.skill5_timer) ctx.simState.skill5_timer = [];
                if (ctx.simState.skill5_timer.length < 2) {
                    ctx.addTimer("skill5_timer", 2);
                    return ctx.log(4, "발동", null, 2, true);
                }
            },
            step2: (ctx) => {
                // 반격 데미지 후 스택 적립
                const dmg = { val: ctx.getVal(4, '추가공격') };
                ctx.simState.skill7_stacks = Math.min(10, (ctx.simState.skill7_stacks || 0) + 1);
                const sLog = ctx.log(6, "발동", null, null, true);
                return [dmg, sLog];
            }
        });
        return { extraHits };
    },
    // 실시간 수치 변환기
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0, "공증": 0, "트리거뎀증": 0 };
        bonuses["공증"] += (ctx.simState.skill7_stacks || 0) * ctx.getVal(6, '공증');
        bonuses["뎀증"] += (ctx.simState.skill5_timer || []).length * ctx.getVal(4, '뎀증');

        if (ctx.simState.skill4_timer > 0) bonuses["트리거뎀증"] += ctx.getVal(3, '트리거뎀증');
        if (ctx.simState.skill8_timer > 0) bonuses["트리거뎀증"] += ctx.getVal(7, '트리거뎀증', true);

        return bonuses;
    }
  },
  "tayangsuyi": {
    commonControls: ["ally_warrior_debuffer_count", "ally_ult_count"],

    // 1. 턴 시작 (전의 수급)
    onTurn: (ctx) => {
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
                // [수정] 표준 시스템 사용 (gain 대신 커스텀 문자열 조합)
                ctx.log("skill4_spirit", `${gained}회 수급 (${rawProb.toFixed(0)}%)`);
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
            // [수정] 표준 시스템 사용
            ctx.log("skill4_spirit", "all_consume");
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
            // 매 턴 시작 시 확률에 따라 HP 100% 유지 여부 결정
            const prob = ctx.customValues.hp_100_prob ?? 100;
            // 성공 시 true, 실패 시 false 대입하여 UI에 'ON'으로 표시되게 함
            ctx.simState.skill4_active = (Math.random() * 100 < prob);
    
            if (ctx.simState.skill4_active && prob < 100) {
                // 유지율이 100% 미만일 때 성공한 경우에만 로그 출력 (가독성)
                ctx.log(3, "발동", prob);
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
            if (ctx.simState.skill4_active) {
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
    onTurn: (ctx) => {
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },

    onAttack: (ctx) => {
        const extraHits = [];
        const hasScar = ctx.simState.scar;

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
                ctx.simState.scar = false;
                ctx.log("scar", "consume");
            } else {
                // 각흔 부여
                ctx.simState.scar = true;
                ctx.log("scar", "apply");
            }
        }
        return { extraHits };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "평타뎀증": 0, "필살기뎀증": 0 };
        const hasScar = ctx.simState.scar;

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
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },
    onAttack: (ctx) => {
        const extraHits = [];
        // 방어 시에는 공격 패시브(긴박 공감 등)가 발동하지 않음
        if (ctx.isDefend) return { extraHits };

        if (!ctx.simState.skill4_vuln_timer) ctx.simState.skill4_vuln_timer = [];

        // [패시브2] 긴박 공감: 공격 시 50% 확률로 받뎀증 (2턴)
        if (Math.random() < 0.5) {
            ctx.addTimer("skill4_vuln_timer", 2, { val: ctx.getVal(3, '뎀증디버프'), name: "긴박공감" });
            ctx.log(3, "발동", 50, 2);
        }

        // [패시브5] 급습 밧줄: 필살기 발동 시 받뎀증 (1턴)
        if (ctx.isUlt) {
            ctx.addTimer("skill4_vuln_timer", 1, { val: ctx.getVal(6, '뎀증디버프'), name: "급습밧줄" });
            ctx.log(6, "발동", null, 1);
        }

        return { extraHits };
    },
    onAfterAction: (ctx) => {
        // [패시브4] 밧줄 낙인: 방어 시 받뎀증 16% (2턴)
        if (ctx.isDefend) {
            ctx.addTimer("skill4_vuln_timer", 2, { val: ctx.getVal(4, '뎀증디버프'), name: "밧줄낙인" });
            ctx.log(4, "발동", null, 2);
        }
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증디버프": 0, "필살기뎀증": 0 };

        // 활성화된 모든 받뎀증 합산
        if (ctx.simState.skill4_vuln_timer) {
            ctx.simState.skill4_vuln_timer.forEach(v => {
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
    // 1. 턴 시작 (타이머 감소는 엔진이 자동 처리)
    onTurn: (ctx) => {
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },
    onAttack: (ctx) => {
        if (ctx.isDefend) return { extraHits: [] };

        const activeDogs = (ctx.simState.skill4_black_dog_timer > 0 ? 1 : 0) + (ctx.simState.skill4_white_dog_timer > 0 ? 1 : 0);

        return {
            extraHits: [
                // 1. [S5 데미지] 필살기 시 기존 스택 비례 추가타
                (ctx.isUlt && ctx.simState.skill5_hound_stack_timer?.length > 0) && {
                    skillId: "anuberus_skill5",
                    name: "유령의 심장 심판",
                    stack: ctx.simState.skill5_hound_stack_timer.length,
                    coef: ctx.simState.skill5_hound_stack_timer.reduce((sum, h) => sum + h.val, 0)
                },

                // 2. [버프 갱신 그룹] 개 수만큼 버프를 먼저 모두 갱신합니다 (버프1 -> 버프2)
                activeDogs > 0 && Array.from({ length: activeDogs }, () => ({
                    skillId: "anuberus_skill4",
                    step1: (ctx) => {
                        // 패시브3 스택 적립
                        if (ctx.simState.skill5_hound_stack_timer.length < 4) {
                            ctx.addTimer("skill5_hound_stack_timer", 3, { val: ctx.getVal(4, 'max') });
                        }
                        // 패시브2 디버프 부여 및 로그
                        if (ctx.simState.skill4_vuln_timer.length < 4) {
                            ctx.addTimer("skill4_vuln_timer", 3, { val: ctx.getVal(3, '속성디버프') });
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
                        if (Math.random() * 100 < prob) { ctx.setTimer("skill4_black_dog_timer", 2); res.push(ctx.log("[흑구]", "발동", prob.toFixed(0), 2, true)); }
                        if (Math.random() * 100 < prob) { ctx.setTimer("skill4_white_dog_timer", 2); res.push(ctx.log("[백구]", "발동", prob.toFixed(0), 2, true)); }
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
                ctx.setTimer("skill4_black_dog_timer", 2); 
                ctx.log("[흑구]", "발동", prob.toFixed(0), 2); 
            }
            if (Math.random() * 100 < prob) { 
                ctx.setTimer("skill4_white_dog_timer", 2); 
                ctx.log("[백구]", "발동", prob.toFixed(0), 2); 
            }
        }
    },

    getLiveBonuses: (ctx) => {
        const bonuses = { "속성디버프": 0, "필살기뎀증": 0, "공증": 0 };

        // 활성화된 어둠속성 디버프 합산
        if (ctx.simState.skill4_vuln_timer) {
            ctx.simState.skill4_vuln_timer.forEach(v => {
                bonuses["속성디버프"] += v.val;
            });
        }

        // [패시브6] 무음모드 해제: 깨어있는 개 한 마리당 필살기 뎀증 (각 27%)
        const activeDogs = (ctx.simState.skill4_black_dog_timer > 0 ? 1 : 0) + (ctx.simState.skill4_white_dog_timer > 0 ? 1 : 0);
        if (activeDogs > 0) {
            bonuses["필살기뎀증"] += ctx.getVal(6, '필살기뎀증') * activeDogs;
        }

        return bonuses;
    }
  },
  "kumoyama": {
    commonControls: ["hit_prob"],
    // [수정] 등록된 범용 키 'taunt' 반환
    isTaunted: (ctx) => ctx.simState.skill2_taunt_timer > 0 ? "taunt" : false,
    onTurn: (ctx) => {
        // 수동 타이머 관리 제거 (엔진 자동 처리)
    },
    onAttack: (ctx) => {
        const extraHits = [];
        
        // [패시브4] 만상 순환의 자세: 공격(보통/필살) 시 50% 확률로 데미지 증가
        if (Math.random() < 0.5) {
            ctx.setTimer("skill4_buff_timer", 2);
            ctx.log(3, "발동", 50, 2);
        }

        if (ctx.isUlt) {
            // [필살기] 조롱 상태 부여 (당해 턴 적 공격을 받아내기 위해 1턴 설정)
            ctx.setTimer("skill2_taunt_timer", 1);
            ctx.log("taunt", "activate");

            // [패시브7] 수파리·신성: 필살기 사용 시 1턴 간 데미지 증가
            ctx.setTimer("skill7_timer", 1);
            ctx.log(6, "발동", null, 1);
        }

        return { extraHits };
    },
    onEnemyHit: (ctx) => {
        const extraHits = [];

        // 1. [필살기 반격] 조롱 상태일 때 피격 시 반격 발생
        if (ctx.simState.skill2_taunt_timer > 0) {
            const isStamped = ctx.stats.stamp;
            extraHits.push({
                skillId: "kumoyama_skill2",
                name: isStamped ? "열풍요란 (반격)" : "열풍요란 (반격)",
                type: "추가공격",
                isMulti: isStamped,
                coef: ctx.getVal(1, '추가공격')
            });
        }

        // 2. [패시브5] 발도 견벽의 자세: 반격 직후 50% 확률로 데미지 증가 판정
        extraHits.push({
            skillId: "kumoyama_skill5",
            step1: (ctx) => {
                if (Math.random() < 0.5) {
                    ctx.setTimer("skill5_buff_timer", 2);
                    // [수정] 엔진이 로그를 쌓도록 skipPush(true) 설정
                    return ctx.log(4, "발동", 50, 2, true);
                }
            }
        });

        return { extraHits };
    },
    onAfterAction: (ctx) => {
        return { extraHits: [] };
    },
    getLiveBonuses: (ctx) => {
        const bonuses = { "뎀증": 0 };

        // 패시브4 만상
        if (ctx.simState.skill4_buff_timer > 0) bonuses["뎀증"] += ctx.getVal(3, '뎀증');
        // 패시브5 발도
        if (ctx.simState.skill5_buff_timer > 0) bonuses["뎀증"] += ctx.getVal(4, '뎀증');
        
        // 패시브7 수파리 (히든 수치 40% 직접 반영)
        if (ctx.simState.skill7_timer > 0) {
            const sLv = parseInt(ctx.stats.skills?.s7 || 1);
            const rate = getSkillMultiplier(sLv, 0.6);
            bonuses["뎀증"] += 40 * rate;
        }

        return bonuses;
    }
  }
};